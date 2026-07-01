import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendWAMessageWithResult } from '@/lib/whatsapp'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, body, contactId } = await req.json()
  if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 400 })
  if (String(to).endsWith('@g.us')) {
    return NextResponse.json({ error: 'No se permite enviar seguimientos a grupos.' }, { status: 400 })
  }

  const { jid, messageId } = await sendWAMessageWithResult(to, body)

  await prisma.whatsAppMessage.upsert({
    where: { messageId },
    update: {
      remoteJid: jid,
      fromMe: true,
      content: body,
      timestamp: new Date(),
      contactId: contactId || null,
    },
    data: {
      remoteJid: jid,
      fromMe: true,
      content: body,
      messageId,
      timestamp: new Date(),
      contactId: contactId || null,
    },
  })

  return NextResponse.json({ ok: true, messageId })
}
