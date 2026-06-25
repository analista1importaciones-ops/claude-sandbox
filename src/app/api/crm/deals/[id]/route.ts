import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queueOrSendDealStageWorkflow } from '@/lib/workflows'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const previous = await prisma.deal.findUnique({ where: { id: params.id }, include: { contact: true } })
  const data = {
    ...(body.stage ? { stage: body.stage } : {}),
    ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
    ...(body.currency ? { currency: body.currency } : {}),
    ...(body.estimatedCloseAt !== undefined ? { estimatedCloseAt: body.estimatedCloseAt ? new Date(body.estimatedCloseAt) : null } : {}),
    ...(body.quotationId !== undefined ? { quotationId: body.quotationId || null } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  }
  const deal = await prisma.deal.update({ where: { id: params.id }, data, include: { contact: true } })
  if (body.stage && previous?.stage !== body.stage) {
    const workflows = await prisma.workflow.findMany({
      where: { active: true, trigger: 'DEAL_STAGE_CHANGED', stage: body.stage },
      include: { template: true },
    })
    const seen = new Set<string>()
    for (const wf of workflows) {
      const key = [wf.stage, wf.serviceTag || 'todos', wf.templateId || '', wf.delayDays, wf.delayHours, wf.delayMinutes].join('|')
      if (seen.has(key)) continue
      seen.add(key)
      if (deal.contact) {
        await queueOrSendDealStageWorkflow(wf, deal.contact, deal.id, body.stage)
          .catch(e => console.error('[Workflow] send failed', e))
      }
    }
  }
  return NextResponse.json(deal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.deal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
