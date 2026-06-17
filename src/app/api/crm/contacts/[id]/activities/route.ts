import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activities = await prisma.activity.findMany({
    where: { contactId: params.id },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(activities)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, text } = body

  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const activity = await prisma.activity.create({
    data: {
      contactId: params.id,
      type: type || 'NOTA',
      text,
      createdById: (session.user as { id: string }).id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })
  return NextResponse.json(activity, { status: 201 })
}
