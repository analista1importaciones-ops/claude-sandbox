import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deals = await prisma.deal.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          tags: true,
          _count: { select: { activities: true, whatsappMessages: true, appointments: true } },
        },
      },
      quotation: { select: { number: true } },
    },
  })

  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const deal = await prisma.deal.create({
    data: {
      contactId: body.contactId,
      stage: body.stage ?? 'PAUTA',
      estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
      currency: body.currency ?? 'USD',
      notes: body.notes ?? null,
    },
    include: { contact: true, quotation: { select: { number: true } } },
  })

  return NextResponse.json(deal, { status: 201 })
}
