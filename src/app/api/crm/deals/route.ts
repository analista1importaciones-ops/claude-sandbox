import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDefaultFunnels, legacyStageForFunnelStage } from '@/lib/funnels'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDefaultFunnels()
  const { searchParams } = new URL(req.url)
  const funnelId = searchParams.get('funnelId')

  const deals = await prisma.deal.findMany({
    where: funnelId ? { funnelId } : {},
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
      funnel: { select: { id: true, name: true } },
      funnelStage: { select: { id: true, name: true, order: true, color: true } },
    },
  })

  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  const funnelStage = body.funnelStageId
    ? await prisma.funnelStage.findUnique({ where: { id: body.funnelStageId } })
    : null

  const deal = await prisma.deal.create({
    data: {
      contactId: body.contactId,
      stage: funnelStage ? legacyStageForFunnelStage(funnelStage.name) as never : body.stage ?? 'PAUTA',
      funnelId: funnelStage?.funnelId ?? body.funnelId ?? null,
      funnelStageId: funnelStage?.id ?? null,
      estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
      currency: body.currency ?? 'USD',
      notes: body.notes ?? null,
    },
    include: {
      contact: true,
      quotation: { select: { number: true } },
      funnel: { select: { id: true, name: true } },
      funnelStage: { select: { id: true, name: true, order: true, color: true } },
    },
  })

  return NextResponse.json(deal, { status: 201 })
}
