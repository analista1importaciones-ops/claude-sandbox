import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PipelineStage, Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FUNNEL_SERVICE_TAGS, SERVICE_LABEL_TAGS } from '@/lib/service-tags'

const OPEN_STAGES = [
  PipelineStage.PAUTA,
  PipelineStage.CONTACTADO,
  PipelineStage.COTIZADO,
  PipelineStage.SEGUIMIENTO,
  PipelineStage.NEGOCIANDO,
]

function compactContactIds(contactIds: Array<string | null>): string[] {
  return Array.from(new Set(contactIds.filter((id): id is string => Boolean(id))))
}

function buildFunnelWhere(funnel: string | null): Prisma.DealWhereInput {
  if (!funnel || funnel === 'todos') return {}

  if (funnel === 'cargas') {
    return {
      contact: {
        is: {
          OR: [
            { serviceLabel: { in: ['CARGA', 'COURIER', 'NACIONALIZACION', 'TRANSPORTE_PESADO', 'SEGURO_CARGA'] } },
            { tags: { hasSome: FUNNEL_SERVICE_TAGS.cargas } },
          ],
        },
      },
    }
  }

  const tags = FUNNEL_SERVICE_TAGS[funnel]
  if (!tags) return {}
  const serviceLabels: Record<string, string> = {
    cursos: 'CURSOS',
    asesorias: 'ASESORIAS',
    inspecciones: 'INSPECCIONES',
    proveedores: 'BUSQUEDA_PROVEEDORES',
  }
  return {
    contact: {
      is: {
        OR: [
          { tags: { hasSome: tags } },
          serviceLabels[funnel] ? { serviceLabel: serviceLabels[funnel] as never } : {},
        ],
      },
    },
  }
}

async function ensureRecentWhatsAppDeals() {
  const recentWhatsAppContacts = await prisma.whatsAppMessage.findMany({
    where: {
      contactId: { not: null },
      NOT: [
        { remoteJid: { contains: '@g.us' } },
        { remoteJid: { contains: 'broadcast' } },
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: 300,
    select: { contactId: true },
  })

  const contactIds = compactContactIds(recentWhatsAppContacts.map((message) => message.contactId))
  if (contactIds.length === 0) return

  const existingOpenDeals = await prisma.deal.findMany({
    where: {
      contactId: { in: contactIds },
      stage: { in: OPEN_STAGES },
    },
    select: { contactId: true },
  })

  const contactsWithOpenDeal = new Set(existingOpenDeals.map((deal) => deal.contactId))
  const missingContactIds = contactIds.filter((contactId) => !contactsWithOpenDeal.has(contactId))
  if (missingContactIds.length === 0) return

  await prisma.deal.createMany({
    data: missingContactIds.map((contactId) => ({
      contactId,
      stage: PipelineStage.PAUTA,
      currency: 'USD',
      notes: 'Oportunidad creada automáticamente desde WhatsApp.',
    })),
  })

  const missingContacts = await prisma.contact.findMany({
    where: { id: { in: missingContactIds } },
    select: { id: true, tags: true, serviceLabel: true },
  })
  await Promise.all(missingContacts.map((contact) => {
    const serviceTag = SERVICE_LABEL_TAGS[contact.serviceLabel]
    if (!serviceTag || contact.tags.some((tag) => tag === serviceTag)) return Promise.resolve()
    return prisma.contact.update({
      where: { id: contact.id },
      data: { tags: { push: serviceTag } },
    })
  }))
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const funnel = req.nextUrl.searchParams.get('funnel')
  const where = buildFunnelWhere(funnel)

  await ensureRecentWhatsAppDeals()

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          tags: true,
          serviceLabel: true,
        },
      },
      quotation: { select: { number: true } },
    },
  })

  const contactIds = Array.from(new Set(deals.map((deal) => deal.contactId).filter(Boolean)))
  const [activityCounts, whatsappCounts, appointmentCounts] = contactIds.length > 0
    ? await Promise.all([
      prisma.activity.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { _all: true },
      }),
      prisma.whatsAppMessage.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { _all: true },
      }),
    ])
    : [[], [], []]

  const activitiesByContact = new Map(activityCounts.map((item) => [item.contactId, item._count._all]))
  const whatsappByContact = new Map(whatsappCounts.map((item) => [item.contactId, item._count._all]))
  const appointmentsByContact = new Map(appointmentCounts.map((item) => [item.contactId, item._count._all]))

  return NextResponse.json(deals.map((deal) => ({
    ...deal,
    contact: {
      ...deal.contact,
      _count: {
        activities: activitiesByContact.get(deal.contactId) || 0,
        whatsappMessages: whatsappByContact.get(deal.contactId) || 0,
        appointments: appointmentsByContact.get(deal.contactId) || 0,
      },
    },
  })))
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
