import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true, email: true } }, rate: { include: { rateSheet: { include: { carrier: true } } } } },
  })

  if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(q)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Status-only update
  if (body.status && Object.keys(body).length === 1) {
    const q = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: body.status },
    })
    return NextResponse.json(q)
  }

  // Full quotation update
  const q = await prisma.quotation.update({
    where: { id: params.id },
    data: {
      customerName: body.customerName,
      customerEmail: body.customerEmail ?? null,
      customerPhone: body.customerPhone ?? null,
      originPort: body.originPort,
      destinationPort: body.destinationPort,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry ?? null,
      mode: body.mode,
      incoterm: body.incoterm,
      currency: body.currency,
      cbm: body.cbm ? Number(body.cbm) : null,
      containers: body.containers ? Number(body.containers) : null,
      grossWeightKg: body.grossWeightKg ? Number(body.grossWeightKg) : null,
      productDesc: body.productDesc ?? null,
      issueDate: new Date(body.issueDate),
      validUntil: new Date(body.validUntil),
      transitDaysMin: body.transitDaysMin ?? null,
      transitDaysMax: body.transitDaysMax ?? null,
      frequency: body.frequency ?? null,
      intlCharges: body.intlCharges,
      localCharges: body.localCharges,
      otherCharges: body.otherCharges,
      intlTotal: body.intlTotal,
      localTotal: body.localTotal,
      otherTotal: body.otherTotal,
      grandTotal: body.grandTotal,
      notes: body.notes ?? null,
    },
  })

  return NextResponse.json(q)
}
