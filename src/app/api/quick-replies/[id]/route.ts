import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, body } = await req.json()
  const reply = await prisma.quickReply.update({
    where: { id: params.id },
    data: { ...(title !== undefined ? { title } : {}), ...(body !== undefined ? { body } : {}) },
  })
  return NextResponse.json(reply)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.quickReply.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
