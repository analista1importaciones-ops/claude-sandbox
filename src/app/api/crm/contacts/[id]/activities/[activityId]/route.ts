import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; activityId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const existing = await prisma.activity.findFirst({
    where: { id: params.activityId, contactId: params.id },
    select: { id: true },
  })

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activity = await prisma.activity.update({
    where: { id: params.activityId },
    data: {
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
      ...(body.completed !== undefined ? { completedAt: body.completed ? new Date() : null } : {}),
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json(activity)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; activityId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.activity.findFirst({
    where: { id: params.activityId, contactId: params.id },
    select: { id: true },
  })

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.activity.delete({ where: { id: params.activityId } })
  return NextResponse.json({ ok: true })
}
