import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SERVICE_LABEL_TAGS, getServiceLabelForTags, mergeContactTags } from '@/lib/service-tags'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      deals: {
        include: { quotation: { select: { id: true, number: true, grandTotal: true } } },
        orderBy: { createdAt: 'desc' },
      },
      activities: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      appointments: {
        orderBy: { startAt: 'asc' },
      },
      serviceInvoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(contact)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const existing = await prisma.contact.findUnique({
    where: { id: params.id },
    select: { tags: true, serviceLabel: true },
  })
  const mergedTags = mergeContactTags(existing?.tags ?? [], Array.isArray(body.tags) ? body.tags : [])
  const serviceLabel = getServiceLabelForTags(mergedTags, body.serviceLabel ?? existing?.serviceLabel ?? 'OTRO')
  const serviceTag = SERVICE_LABEL_TAGS[serviceLabel]
  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.company !== undefined ? { company: body.company || null } : {}),
    ...(body.email !== undefined ? { email: body.email || null } : {}),
    ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
    ...(body.waName !== undefined ? { waName: body.waName || null } : {}),
    ...(body.source !== undefined ? { source: body.source } : {}),
    ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId || null } : {}),
    serviceLabel: serviceLabel as never,
    ...(body.tags !== undefined || serviceTag
      ? { tags: mergeContactTags(mergedTags, serviceTag ? [serviceTag] : []) }
      : {}),
  }
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(contact)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.contact.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
