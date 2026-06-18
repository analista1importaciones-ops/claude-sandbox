import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWAMessage } from '@/lib/whatsapp'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const previous = await prisma.deal.findUnique({ where: { id: params.id }, include: { contact: true } })
  const deal = await prisma.deal.update({ where: { id: params.id }, data: body, include: { contact: true } })
  if (body.stage && previous?.stage !== body.stage) {
    const workflows = await prisma.workflow.findMany({
      where: { active: true, trigger: 'DEAL_STAGE_CHANGED', stage: body.stage },
      include: { template: true },
    })
    for (const wf of workflows) {
      const phone = deal.contact?.phone
      const msg = wf.template?.body ?? null
      if (phone && msg) {
        const text = msg.replace('{{nombre}}', deal.contact?.name ?? '').replace('{{empresa}}', deal.contact?.company ?? '')
        try {
          await sendWAMessage(phone, text)
          await prisma.whatsAppMessage.create({ data: { jid: `${phone}@s.whatsapp.net`, fromMe: true, body: text, contactId: deal.contact?.id ?? null } })
        } catch (e) { console.error('[Workflow] send failed', e) }
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
