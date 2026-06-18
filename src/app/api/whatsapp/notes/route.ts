import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const jid = req.nextUrl.searchParams.get('jid')
  if (!jid) return NextResponse.json([])
  return NextResponse.json(
    await prisma.internalNote.findMany({
      where: { remoteJid: jid },
      orderBy: { createdAt: 'asc' },
    })
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const note = await prisma.internalNote.create({
    data: { remoteJid: body.remoteJid, content: body.content, contactId: body.contactId || null },
  })
  return NextResponse.json(note)
}
