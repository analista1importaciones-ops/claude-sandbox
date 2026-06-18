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

  const seen = new Set()
  const conversations = []
  for (const m of all) {
    if (!seen.has(m.remoteJid)) {
      seen.add(m.remoteJid)
      conversations.push(m)
    }
  }

  return NextResponse.json(conversations)
}
