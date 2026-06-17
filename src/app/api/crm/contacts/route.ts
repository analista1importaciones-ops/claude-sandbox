import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const serviceLabel = searchParams.get('serviceLabel') || ''
  const assignedToId = searchParams.get('assignedToId') || ''

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        serviceLabel ? { serviceLabel: serviceLabel as never } : {},
        assignedToId ? { assignedToId } : {},
      ],
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { deals: true, activities: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, company, email, phone, source, serviceLabel, assignedToId } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const contact = await prisma.contact.create({
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      source: source || 'OTRO',
      serviceLabel: serviceLabel || 'OTRO',
      assignedToId: assignedToId || null,
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
