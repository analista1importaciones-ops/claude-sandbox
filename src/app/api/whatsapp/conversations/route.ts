import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const all = await prisma.whatsAppMessage.findMany({
      orderBy: { timestamp: 'desc' },
      include: { contact: { select: { name: true, id: true, phone: true } } },
    })

    const waConvs = await prisma.waConversation.findMany()
    const convMap = new Map(waConvs.map(c => [c.remoteJid, c]))

    const isBlockedJid = (jid: string | null | undefined) => {
      if (!jid) return true
      return jid.includes('status@broadcast') || jid.includes('@broadcast') || jid.endsWith('@g.us')
    }

    const allContacts = await prisma.contact.findMany({ select: { id: true, name: true, phone: true } })
    const phoneMap = new Map<string, { id: string; name: string; phone: string | null }>()
    for (const c of allContacts) {
      if (c.phone) phoneMap.set(c.phone.slice(-8), { id: c.id, name: c.name, phone: c.phone })
    }

    const contactByJid = new Map<string, { id: string; name: string; phone: string | null }>()
    const waNameByJid = new Map<string, string>()
    for (const m of all) {
      if (isBlockedJid(m.remoteJid) || isBlockedJid(m.phoneJid)) continue
      if (m.contact && !contactByJid.has(m.remoteJid)) {
        contactByJid.set(m.remoteJid, m.contact)
      }
      if (!m.fromMe && m.waName && !waNameByJid.has(m.remoteJid)) {
        waNameByJid.set(m.remoteJid, m.waName)
      }
    }

    const seen = new Set()
    const conversations = []
    for (const m of all) {
      if (isBlockedJid(m.remoteJid) || isBlockedJid(m.phoneJid)) continue
      if (!seen.has(m.remoteJid)) {
        seen.add(m.remoteJid)
        const conv = convMap.get(m.remoteJid)
        let contact = contactByJid.get(m.remoteJid) ?? m.contact
        const phoneJid = m.phoneJid ?? conv?.phoneJid ?? (m.remoteJid.endsWith('@s.whatsapp.net') ? m.remoteJid : null)
        if (!contact && phoneJid) {
          const phone = phoneJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
          const found = phoneMap.get(phone.slice(-8))
          if (found) contact = found
        }
        conversations.push({
          ...m,
          phoneJid,
          contact,
          waName: waNameByJid.get(m.remoteJid) ?? (!m.fromMe ? m.waName : null),
          unreadCount: conv?.unreadCount ?? 0,
          convStatus: conv?.status ?? 'OPEN',
        })
      }
    }

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('[WhatsApp conversations] load failed', error)
    return NextResponse.json({ error: 'No se pudieron cargar las conversaciones de WhatsApp.' }, { status: 500 })
  }
}
