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

  const seen = new Set()
  const conversations = []
  for (const m of all) {
    if (BLOCKED.some(b => m.remoteJid.includes(b))) continue
    if (!seen.has(m.remoteJid)) {
      seen.add(m.remoteJid)
      const conv = convMap.get(m.remoteJid)
      conversations.push({ ...m, unreadCount: conv?.unreadCount ?? 0, convStatus: conv?.status ?? 'OPEN' })
    }
  }

  return NextResponse.json(conversations)
}
