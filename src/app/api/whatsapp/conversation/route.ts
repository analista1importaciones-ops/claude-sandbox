import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { remoteJid, action } = await req.json()
  if (action === 'read') {
    await prisma.waConversation.upsert({
      where: { remoteJid },
      create: { remoteJid, unreadCount: 0, status: 'OPEN' },
      update: { unreadCount: 0 },
    })
  } else if (action === 'attended') {
    await prisma.waConversation.upsert({
      where: { remoteJid },
      create: { remoteJid, unreadCount: 0, status: 'ATTENDED' },
      update: { unreadCount: 0, status: 'ATTENDED' },
    })
  } else if (action === 'reopen') {
    await prisma.waConversation.upsert({
      where: { remoteJid },
      create: { remoteJid, unreadCount: 0, status: 'OPEN' },
      update: { status: 'OPEN' },
    })
  }
  return NextResponse.json({ ok: true })
}
