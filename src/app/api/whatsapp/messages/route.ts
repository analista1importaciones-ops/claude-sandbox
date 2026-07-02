import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')
    const jid = searchParams.get('jid')
    if (jid?.endsWith('@g.us')) return NextResponse.json([])

    const relatedMessage = !contactId && jid
      ? await prisma.whatsAppMessage.findFirst({
        where: { OR: [{ remoteJid: jid }, { phoneJid: jid }] },
        orderBy: { timestamp: 'desc' },
        select: { contactId: true },
      })
      : null
    const resolvedContactId = contactId || relatedMessage?.contactId

    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        ...(resolvedContactId
          ? { OR: [{ contactId: resolvedContactId }, ...(jid ? [{ remoteJid: jid }, { phoneJid: jid }] : [])] }
          : jid ? { OR: [{ remoteJid: jid }, { phoneJid: jid }] } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error('[WhatsApp messages] load failed', error)
    return NextResponse.json({ error: 'No se pudieron cargar los mensajes de WhatsApp.' }, { status: 500 })
  }
}
