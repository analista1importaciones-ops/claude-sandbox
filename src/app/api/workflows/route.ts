import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workflows = await prisma.workflow.findMany({
    include: {
      template: true,
      funnel: true,
      funnelStage: true,
      steps: { include: { template: true }, orderBy: { order: 'asc' } },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { contact: { select: { name: true, phone: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(workflows)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const funnelStage = body.funnelStageId
    ? await prisma.funnelStage.findUnique({ where: { id: body.funnelStageId } })
    : null
  if (body.trigger === 'DEAL_STAGE_CHANGED' && body.funnelId && !funnelStage) {
    return NextResponse.json({ error: 'Selecciona una etapa del embudo' }, { status: 400 })
  }
  const rawSteps = Array.isArray(body.steps) && body.steps.length > 0
    ? body.steps
    : [{ delayDays: body.delayDays, delayHours: body.delayHours, delayMinutes: body.delayMinutes, templateId: body.templateId }]
  const steps = rawSteps
    .filter((step: { templateId?: string }) => step.templateId)
    .map((step: { delayDays?: unknown; delayHours?: unknown; delayMinutes?: unknown; templateId?: string }, index: number) => ({
      order: index + 1,
      delayDays: Number(step.delayDays || 0),
      delayHours: Number(step.delayHours || 0),
      delayMinutes: Number(step.delayMinutes || 0),
      templateId: step.templateId || null,
    }))
  if (steps.length === 0) {
    return NextResponse.json({ error: 'Agrega al menos una plantilla a la secuencia.' }, { status: 400 })
  }

  const serviceTag = !body.serviceTag || ['Todos', 'Todos los servicios'].includes(body.serviceTag) ? null : body.serviceTag
  const wf = await prisma.$transaction(async tx => {
    const workflow = await tx.workflow.create({
      data: {
        name: body.name,
        trigger: body.trigger,
        stage: funnelStage ? null : body.stage || null,
        serviceTag: funnelStage ? null : serviceTag,
        funnelId: funnelStage?.funnelId || body.funnelId || null,
        funnelStageId: funnelStage?.id || null,
        delayDays: steps[0]?.delayDays || 0,
        delayHours: steps[0]?.delayHours || 0,
        delayMinutes: steps[0]?.delayMinutes || 0,
        templateId: steps[0]?.templateId || null,
        active: body.active ?? true,
      },
    })
    await tx.workflowStep.createMany({
      data: steps.map((step: { order: number; delayDays: number; delayHours: number; delayMinutes: number; templateId: string | null }) => ({
        ...step,
        workflowId: workflow.id,
      })),
    })
    return tx.workflow.findUniqueOrThrow({
      where: { id: workflow.id },
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
