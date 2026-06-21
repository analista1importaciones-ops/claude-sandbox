import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ContactSummary = { id: string; name: string; phone: string | null }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(150, Math.max(20, Number(searchParams.get('limit') || 80) || 80))
    const scan = Math.min(1000, Math.max(limit, Number(searchParams.get('scan') || 500) || 500))
    const BLOCKED = ['status@broadcast', 'broadcast', '@g.us']

    const recentMessages = await prisma.whatsAppMessage.findMany({
      where: {
        NOT: BLOCKED.map((blocked) => ({ remoteJid: { contains: blocked } })),
      },
      orderBy: { timestamp: 'desc' },
      take: scan,
      select: {
        id: true,
        remoteJid: true,
        phoneJid: true,
        fromMe: true,
        content: true,
        messageId: true,
        timestamp: true,
        contactId: true,
        mediaUrl: true,
        mediaType: true,
        waName: true,
        createdAt: true,
        contact: { select: { id: true, name: true, phone: true } },
      },
    })

    const seen = new Set<string>()
    const latestMessages = []
    const remoteJids: string[] = []
    const contactByJid = new Map<string, ContactSummary>()
    const waNameByJid = new Map<string, string>()

    for (const message of recentMessages) {
      if (BLOCKED.some(b => message.remoteJid.includes(b))) continue
      if (message.contact) {
        contactByJid.set(message.remoteJid, message.contact)
      }
      if (!message.fromMe && message.waName && !waNameByJid.has(message.remoteJid)) {
        waNameByJid.set(message.remoteJid, message.waName)
      }
      if (!seen.has(message.remoteJid)) {
        seen.add(message.remoteJid)
        latestMessages.push(message)
        remoteJids.push(message.remoteJid)
        if (latestMessages.length >= limit) break
      }
    }

    const waConvs = await prisma.waConversation.findMany({
      where: { remoteJid: { in: remoteJids } },
      select: { remoteJid: true, phoneJid: true, unreadCount: true, status: true },
    })
    const convMap = new Map(waConvs.map(c => [c.remoteJid, c]))

    const conversations = latestMessages.map((message) => {
      const conv = convMap.get(message.remoteJid)
      let contact = contactByJid.get(message.remoteJid)
        ?? message.contact
      const phoneJid = message.phoneJid ?? conv?.phoneJid ?? (message.remoteJid.endsWith('@s.whatsapp.net') ? message.remoteJid : null)
      return {
        ...message,
        phoneJid,
        contact,
        waName: waNameByJid.get(message.remoteJid) ?? (!message.fromMe ? message.waName : null),
        unreadCount: conv?.unreadCount ?? 0,
        convStatus: conv?.status ?? 'OPEN',
      }
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('[WhatsApp conversations] load failed', error)
    return NextResponse.json({ error: 'No se pudieron cargar las conversaciones de WhatsApp.' }, { status: 500 })
  }
}
