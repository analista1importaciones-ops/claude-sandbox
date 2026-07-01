import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const funnelStage = body.funnelStageId
    ? await prisma.funnelStage.findUnique({ where: { id: body.funnelStageId } })
    : null
  const rawSteps = Array.isArray(body.steps) ? body.steps : null
  const steps = rawSteps
    ?.filter((step: { templateId?: string }) => step.templateId)
    .map((step: { delayDays?: unknown; delayHours?: unknown; delayMinutes?: unknown; templateId?: string }, index: number) => ({
      order: index + 1,
      delayDays: Number(step.delayDays || 0),
      delayHours: Number(step.delayHours || 0),
      delayMinutes: Number(step.delayMinutes || 0),
      templateId: step.templateId || null,
    }))
  if (rawSteps && (!steps || steps.length === 0)) {
    return NextResponse.json({ error: 'Agrega al menos una plantilla a la secuencia.' }, { status: 400 })
  }
  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
    ...(body.stage !== undefined ? { stage: funnelStage ? null : body.stage || null } : {}),
    ...(body.funnelId !== undefined ? { funnelId: funnelStage?.funnelId || body.funnelId || null } : {}),
    ...(body.funnelStageId !== undefined ? { funnelStageId: funnelStage?.id || null } : {}),
    ...(body.serviceTag !== undefined ? {
      serviceTag: funnelStage || !body.serviceTag || ['Todos', 'Todos los servicios'].includes(body.serviceTag) ? null : body.serviceTag,
    } : {}),
    ...(body.delayDays !== undefined || steps ? { delayDays: Number(steps?.[0]?.delayDays ?? body.delayDays ?? 0) } : {}),
    ...(body.delayHours !== undefined || steps ? { delayHours: Number(steps?.[0]?.delayHours ?? body.delayHours ?? 0) } : {}),
    ...(body.delayMinutes !== undefined || steps ? { delayMinutes: Number(steps?.[0]?.delayMinutes ?? body.delayMinutes ?? 0) } : {}),
    ...(body.templateId !== undefined || steps ? { templateId: steps?.[0]?.templateId || body.templateId || null } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
  }
  const wf = await prisma.$transaction(async tx => {
    await tx.workflow.update({ where: { id: params.id }, data })
    if (steps) {
      await tx.workflowStep.deleteMany({ where: { workflowId: params.id } })
      await tx.workflowStep.createMany({
        data: steps.map((step: { order: number; delayDays: number; delayHours: number; delayMinutes: number; templateId: string | null }) => ({
          ...step,
          workflowId: params.id,
        })),
      })
    }
    return tx.workflow.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        template: true,
        funnel: true,
        funnelStage: true,
        steps: { include: { template: true }, orderBy: { order: 'asc' } },
        runs: { orderBy: { createdAt: 'desc' }, take: 3, include: { contact: { select: { name: true, phone: true } } } },
      },
    })
  })
  return NextResponse.json(wf)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.workflow.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
