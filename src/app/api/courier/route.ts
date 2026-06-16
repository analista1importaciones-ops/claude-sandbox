import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function generateCourierNumber(): Promise<string> {
  const count = await prisma.courierQuotation.count()
  return `COU-${String(count + 1).padStart(4, '0')}`
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotations = await prisma.courierQuotation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(quotations)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const number = await generateCourierNumber()

  const quotation = await prisma.courierQuotation.create({
    data: {
      number,
      createdById: (session.user as { id: string }).id,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry,
      weightKg: parseFloat(body.weightKg),
      lengthCm: body.lengthCm ? parseFloat(body.lengthCm) : null,
      widthCm: body.widthCm ? parseFloat(body.widthCm) : null,
      heightCm: body.heightCm ? parseFloat(body.heightCm) : null,
      volumetricWeightKg: body.volumetricWeightKg ? parseFloat(body.volumetricWeightKg) : null,
      chargeableWeightKg: body.chargeableWeightKg ? parseFloat(body.chargeableWeightKg) : null,
      productDesc: body.productDesc || null,
      declaredValueUsd: body.declaredValueUsd ? parseFloat(body.declaredValueUsd) : null,
      options: body.options ?? [],
      selectedCarrier: body.selectedCarrier || null,
      selectedService: body.selectedService || null,
      selectedPriceUsd: body.selectedPriceUsd ? parseFloat(body.selectedPriceUsd) : null,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(quotation, { status: 201 })
}
