import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workflows = await prisma.workflow.findMany({
    include: { template: true, funnel: true, funnelStage: true },
    orderBy: { createdAt: 'desc' },
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
  const serviceTag = !body.serviceTag || ['Todos', 'Todos los servicios'].includes(body.serviceTag) ? null : body.serviceTag
  const wf = await prisma.workflow.create({
    data: {
      name: body.name,
      trigger: body.trigger,
      stage: funnelStage ? null : body.stage || null,
      serviceTag: funnelStage ? null : serviceTag,
      funnelId: funnelStage?.funnelId || body.funnelId || null,
      funnelStageId: funnelStage?.id || null,
      delayDays: Number(body.delayDays || 0),
      delayHours: Number(body.delayHours || 0),
      delayMinutes: Number(body.delayMinutes || 0),
      templateId: body.templateId || null,
      active: body.active ?? true,
    },
    include: { template: true, funnel: true, funnelStage: true },
  })
  return NextResponse.json(wf)
}
