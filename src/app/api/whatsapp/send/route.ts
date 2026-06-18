import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendWAMessage } from '@/lib/whatsapp'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, body, contactId } = await req.json()
  if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 400 })

  const jid = await sendWAMessage(to, body)

  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: jid,
      fromMe: true,
      content: body,
      messageId: `out-${Date.now()}`,
      timestamp: new Date(),
      contactId: contactId || null,
    },
  })

  return NextResponse.json({ ok: true })
}
