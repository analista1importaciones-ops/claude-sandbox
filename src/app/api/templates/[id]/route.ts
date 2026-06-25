import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const template = await prisma.whatsAppTemplate.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.mediaUrl !== undefined ? { mediaUrl: body.mediaUrl || null } : {}),
      ...(body.mediaType !== undefined ? { mediaType: body.mediaType || null } : {}),
      ...(body.mediaName !== undefined ? { mediaName: body.mediaName || null } : {}),
    },
  })
  return NextResponse.json(template)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.whatsAppTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
