import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function generateNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `GTL-${year}-`
  const last = await prisma.quotation.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const seq = last ? parseInt(last.number.split('-')[2]) + 1 : 1
  return `${prefix}${String(seq).padStart(6, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status && status !== 'all') where.status = status.toUpperCase()
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { number: { contains: search, mode: 'insensitive' } },
      { originPort: { contains: search, mode: 'insensitive' } },
      { destinationPort: { contains: search, mode: 'insensitive' } },
    ]
  }

  const quotations = await prisma.quotation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(quotations)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const number = await generateNumber()

  const quotation = await prisma.quotation.create({
    data: {
      number,
      rateId: body.rateId || null,
      createdById: (session.user as { id: string }).id,
      issueDate: new Date(body.issueDate),
      validUntil: new Date(body.validUntil),
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      originPort: body.originPort,
      destinationPort: body.destinationPort,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry || null,
      mode: body.mode,
      incoterm: body.incoterm,
      currency: body.currency || 'USD',
      cbm: body.cbm ? parseFloat(body.cbm) : null,
      containers: body.containers ? parseInt(body.containers) : null,
      grossWeightKg: body.grossWeightKg ? parseFloat(body.grossWeightKg) : null,
      productDesc: body.productDesc || null,
      transitDaysMin: body.transitDaysMin || null,
      transitDaysMax: body.transitDaysMax || null,
      frequency: body.frequency || null,
      intlCharges: body.intlCharges,
      localCharges: body.localCharges,
      otherCharges: body.otherCharges,
      intlTotal: parseFloat(body.intlTotal),
      localTotal: parseFloat(body.localTotal),
      otherTotal: parseFloat(body.otherTotal),
      grandTotal: parseFloat(body.grandTotal),
      notes: body.notes || null,
    },
  })

  return NextResponse.json(quotation, { status: 201 })
}
