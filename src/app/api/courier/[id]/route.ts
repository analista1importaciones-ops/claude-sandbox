import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = await prisma.courierQuotation.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true, email: true } } },
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
    const q = await prisma.courierQuotation.update({
      where: { id: params.id },
      data: { status: body.status },
    })
    return NextResponse.json(q)
  }

  // Full update
  const q = await prisma.courierQuotation.update({
    where: { id: params.id },
    data: {
      customerName: body.customerName,
      customerEmail: body.customerEmail ?? null,
      customerPhone: body.customerPhone ?? null,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry,
      weightKg: body.weightKg ? parseFloat(body.weightKg) : undefined,
      lengthCm: body.lengthCm ? parseFloat(body.lengthCm) : null,
      widthCm: body.widthCm ? parseFloat(body.widthCm) : null,
      heightCm: body.heightCm ? parseFloat(body.heightCm) : null,
      volumetricWeightKg: body.volumetricWeightKg ? parseFloat(body.volumetricWeightKg) : null,
      chargeableWeightKg: body.chargeableWeightKg ? parseFloat(body.chargeableWeightKg) : null,
      productDesc: body.productDesc ?? null,
      declaredValueUsd: body.declaredValueUsd ? parseFloat(body.declaredValueUsd) : null,
      options: body.options ?? [],
      selectedCarrier: body.selectedCarrier ?? null,
      selectedService: body.selectedService ?? null,
      selectedPriceUsd: body.selectedPriceUsd ? parseFloat(body.selectedPriceUsd) : null,
      notes: body.notes ?? null,
    },
  })

  return NextResponse.json(q)
}
