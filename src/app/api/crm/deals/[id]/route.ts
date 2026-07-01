import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startDealStageWorkflows } from '@/lib/workflows'
import { legacyStageForFunnelStage } from '@/lib/funnels'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const previous = await prisma.deal.findUnique({
    where: { id: params.id },
    include: { contact: true, funnelStage: true },
  })
  const nextFunnelStage = body.funnelStageId
    ? await prisma.funnelStage.findUnique({ where: { id: body.funnelStageId } })
    : null
  const data = {
    ...(body.stage ? { stage: body.stage } : {}),
    ...(nextFunnelStage ? {
      funnelId: nextFunnelStage.funnelId,
      funnelStageId: nextFunnelStage.id,
      stage: legacyStageForFunnelStage(nextFunnelStage.name) as never,
    } : {}),
    ...(body.funnelId !== undefined ? { funnelId: body.funnelId || null } : {}),
    ...(body.funnelStageId === null ? { funnelStageId: null } : {}),
    ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
    ...(body.currency ? { currency: body.currency } : {}),
    ...(body.estimatedCloseAt !== undefined ? { estimatedCloseAt: body.estimatedCloseAt ? new Date(body.estimatedCloseAt) : null } : {}),
    ...(body.quotationId !== undefined ? { quotationId: body.quotationId || null } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  }
  const deal = await prisma.deal.update({
    where: { id: params.id },
    data,
    include: { contact: true, funnelStage: true },
  })

  const stageChanged = Boolean(body.stage && previous?.stage !== body.stage)
  const funnelStageChanged = Boolean(nextFunnelStage && previous?.funnelStageId !== nextFunnelStage.id)
  let automation = null
  let automationError = null
  if (stageChanged || funnelStageChanged) {
    try {
      automation = await startDealStageWorkflows(deal, previous?.funnelStageId)
    } catch (error) {
      automationError = error instanceof Error ? error.message : 'No se pudo iniciar el workflow.'
      console.error('[Workflow] stage start failed', error)
    }
  }
  return NextResponse.json({ ...deal, automation, automationError })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.deal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
