import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
    ...(body.stage !== undefined ? { stage: body.stage || null } : {}),
    ...(body.funnelId !== undefined ? { funnelId: body.funnelId || null } : {}),
    ...(body.funnelStageId !== undefined ? { funnelStageId: body.funnelStageId || null } : {}),
    ...(body.serviceTag !== undefined ? {
      serviceTag: !body.serviceTag || ['Todos', 'Todos los servicios'].includes(body.serviceTag) ? null : body.serviceTag,
    } : {}),
    ...(body.delayDays !== undefined ? { delayDays: Number(body.delayDays || 0) } : {}),
    ...(body.delayHours !== undefined ? { delayHours: Number(body.delayHours || 0) } : {}),
    ...(body.delayMinutes !== undefined ? { delayMinutes: Number(body.delayMinutes || 0) } : {}),
    ...(body.templateId !== undefined ? { templateId: body.templateId || null } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
  }
  const wf = await prisma.workflow.update({ where: { id: params.id }, data, include: { template: true } })
  return NextResponse.json(wf)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.workflow.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
