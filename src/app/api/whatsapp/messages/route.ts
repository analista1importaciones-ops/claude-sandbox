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

    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(jid ? { OR: [{ remoteJid: jid }, { phoneJid: jid }] } : {}),
      },
      orderBy: { timestamp: 'asc' },
      take: 100,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[WhatsApp messages] load failed', error)
    return NextResponse.json({ error: 'No se pudieron cargar los mensajes de WhatsApp.' }, { status: 500 })
  }
}
