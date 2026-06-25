import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runDueScheduledMessages } from '@/lib/workflows'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await runDueScheduledMessages().catch(() => null)
  return NextResponse.json(await prisma.scheduledMessage.findMany({
    orderBy: { sendAt: 'asc' },
    include: { contact: { select: { name: true } } },
  }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  return NextResponse.json(await prisma.scheduledMessage.create({
    data: {
      remoteJid: body.remoteJid,
      body: body.body,
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      mediaName: body.mediaName || null,
      sendAt: new Date(body.sendAt),
      contactId: body.contactId || null,
    },
  }))
}
