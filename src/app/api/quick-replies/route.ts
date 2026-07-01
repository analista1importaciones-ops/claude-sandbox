import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prisma.quickReply.findMany({ orderBy: { createdAt: 'desc' } }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!String(body.title || '').trim() || !String(body.body || '').trim()) {
    return NextResponse.json({ error: 'Título y mensaje son obligatorios.' }, { status: 400 })
  }
  return NextResponse.json(await prisma.quickReply.create({
    data: {
      title: String(body.title).trim(),
      body: String(body.body).trim(),
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      mediaName: body.mediaName || null,
    },
  }))
}
