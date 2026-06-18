import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await prisma.whatsAppMessage.findMany({
    orderBy: { timestamp: 'desc' },
    include: { contact: { select: { name: true, id: true } } },
  })

  const waConvs = await prisma.waConversation.findMany()
  const convMap = new Map(waConvs.map(c => [c.remoteJid, c]))

  const BLOCKED = ['status@broadcast', 'broadcast']

  // Build phone->contact map for fallback lookup
  const allContacts = await prisma.contact.findMany({ select: { id: true, name: true, phone: true } })
  const phoneMap = new Map<string, { id: string; name: string }>()
  for (const c of allContacts) {
    if (c.phone) phoneMap.set(c.phone.slice(-8), { id: c.id, name: c.name })
  }

  const seen = new Set()
  const conversations = []
  for (const m of all) {
    if (BLOCKED.some(b => m.remoteJid.includes(b))) continue
    if (!seen.has(m.remoteJid)) {
      seen.add(m.remoteJid)
      const conv = convMap.get(m.remoteJid)
      let contact = m.contact
      if (!contact) {
        const phone = m.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
        const found = phoneMap.get(phone.slice(-8))
        if (found) contact = found
      }
      conversations.push({ ...m, contact, unreadCount: conv?.unreadCount ?? 0, convStatus: conv?.status ?? 'OPEN' })
    }
  }

  return NextResponse.json(conversations)
}
