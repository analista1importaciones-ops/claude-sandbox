import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runContactCreatedWorkflows } from '@/lib/workflows'
import { SERVICE_LABEL_TAGS, getServiceLabelForTags, mergeContactTags } from '@/lib/service-tags'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const serviceLabel = searchParams.get('serviceLabel') || ''
  const assignedToId = searchParams.get('assignedToId') || ''
  const pageParam = searchParams.get('page')
  const page = Math.max(1, Number(pageParam || 1) || 1)
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 50) || 50))

  const where: Prisma.ContactWhereInput = {
    AND: [
      search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      serviceLabel ? { serviceLabel: serviceLabel as never } : {},
      assignedToId ? { assignedToId } : {},
    ],
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        phone: true,
        waName: true,
        tags: true,
        source: true,
        serviceLabel: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(pageParam ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    pageParam ? prisma.contact.count({ where }) : Promise.resolve(0),
  ])

  const contactIds = contacts.map((contact) => contact.id)
  const [dealCounts, activityCounts] = contactIds.length > 0
    ? await Promise.all([
      prisma.deal.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { _all: true },
      }),
      prisma.activity.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { _all: true },
      }),
    ])
    : [[], []]

  const dealsByContact = new Map(dealCounts.map((item) => [item.contactId, item._count._all]))
  const activitiesByContact = new Map(activityCounts.map((item) => [item.contactId, item._count._all]))
  const contactsWithCounts = contacts.map((contact) => ({
    ...contact,
    _count: {
      deals: dealsByContact.get(contact.id) || 0,
      activities: activitiesByContact.get(contact.id) || 0,
    },
  }))

  if (pageParam) {
    return NextResponse.json({
      contacts: contactsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  }

  return NextResponse.json(contactsWithCounts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, company, email, phone, source, serviceLabel, assignedToId, tags } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const inputTags = Array.isArray(tags) ? tags : []
  const normalizedServiceLabel = getServiceLabelForTags(inputTags, serviceLabel || 'OTRO')
  const serviceTag = SERVICE_LABEL_TAGS[normalizedServiceLabel]
  const normalizedTags = mergeContactTags(inputTags, serviceTag ? [serviceTag] : [])

  const contact = await prisma.contact.create({
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      source: source || 'OTRO',
      serviceLabel: normalizedServiceLabel as never,
      tags: normalizedTags,
      assignedToId: assignedToId || null,
    },
  })
  await runContactCreatedWorkflows(contact)

  return NextResponse.json(contact, { status: 201 })
}
