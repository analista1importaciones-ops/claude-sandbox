import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const search = searchParams.get('search') ?? ''
  const contacts = await prisma.contact.findMany({
    take: limit,
    where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : undefined,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, company: true, phone: true, email: true, waName: true, tags: true, serviceLabel: true, source: true },
  })
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const contact = await prisma.contact.create({
    data: {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      company: body.company ?? null,
      waName: body.waName ?? null,
      tags: body.tags ?? [],
      serviceLabel: body.serviceLabel ?? 'OTRO',
      source: body.source ?? 'OTRO',
    },
  })
  return NextResponse.json(contact)
}
