import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') // active|expiring|expired|replaced|all
  const mode = searchParams.get('mode')
  const search = searchParams.get('search')

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (statusFilter === 'active') {
    where.replacedById = null
    where.validUntil = { gt: sevenDaysFromNow }
  } else if (statusFilter === 'expiring') {
    where.replacedById = null
    where.validUntil = { gte: now, lte: sevenDaysFromNow }
  } else if (statusFilter === 'expired') {
    where.replacedById = null
    where.validUntil = { lt: now }
  } else if (statusFilter === 'replaced') {
    where.replacedById = { not: null }
  }

  if (mode) where.mode = mode

  if (search) {
    where.OR = [
      { originPort: { contains: search, mode: 'insensitive' } },
      { destinationPort: { contains: search, mode: 'insensitive' } },
      { originCountry: { contains: search, mode: 'insensitive' } },
      { rateSheet: { carrier: { name: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const rates = await prisma.rate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      rateSheet: {
        include: { carrier: true },
      },
    },
  })

  return NextResponse.json(rates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { carrierId, reference, receivedAt, sourceFile, notes: sheetNotes, checkDuplicate = true, rate } = body

  // Duplicate check
  if (checkDuplicate) {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const existing = await prisma.rate.findFirst({
      where: {
        replacedById: null,
        validUntil: { gte: now },
        originPort: rate.originPort,
        destinationPort: rate.destinationPort,
        mode: rate.mode,
        rateSheet: { carrierId },
      },
      include: { rateSheet: { include: { carrier: true } } },
    })

    if (existing) {
      return NextResponse.json(
        {
          duplicate: true,
          existingRateId: existing.id,
          existingValidUntil: existing.validUntil,
          carrier: existing.rateSheet.carrier.name,
          route: `${existing.originPort} → ${existing.destinationPort}`,
          mode: existing.mode,
        },
        { status: 409 }
      )
    }
    void sevenDaysFromNow
  }

  const rateSheet = await prisma.rateSheet.create({
    data: {
      carrierId,
      reference,
      receivedAt: new Date(receivedAt),
      sourceFile,
      notes: sheetNotes,
      createdById: session.user.id,
    },
  })

  const newRate = await prisma.rate.create({
    data: {
      rateSheetId: rateSheet.id,
      originCountry: rate.originCountry,
      originPort: rate.originPort,
      destinationPort: rate.destinationPort,
      mode: rate.mode,
      currency: rate.currency ?? 'USD',
      validFrom: new Date(rate.validFrom),
      validUntil: new Date(rate.validUntil),
      freightRate: rate.freightRate ? parseFloat(rate.freightRate) : null,
      freightUnit: rate.freightUnit,
      baf: rate.baf ? parseFloat(rate.baf) : null,
      caf: rate.caf ? parseFloat(rate.caf) : null,
      isps: rate.isps ? parseFloat(rate.isps) : null,
      thcOrigin: rate.thcOrigin ? parseFloat(rate.thcOrigin) : null,
      thcDestination: rate.thcDestination ? parseFloat(rate.thcDestination) : null,
      docFee: rate.docFee ? parseFloat(rate.docFee) : null,
      handling: rate.handling ? parseFloat(rate.handling) : null,
      vgm: rate.vgm ? parseFloat(rate.vgm) : null,
      customsOrigin: rate.customsOrigin ? parseFloat(rate.customsOrigin) : null,
      manifest: rate.manifest ? parseFloat(rate.manifest) : null,
      pickUp: rate.pickUp ? parseFloat(rate.pickUp) : null,
      overlength: rate.overlength ? parseFloat(rate.overlength) : null,
      seal: rate.seal ? parseFloat(rate.seal) : null,
      telexRelease: rate.telexRelease ? parseFloat(rate.telexRelease) : null,
      ams: rate.ams ? parseFloat(rate.ams) : null,
      gri: rate.gri ? parseFloat(rate.gri) : null,
      pss: rate.pss ? parseFloat(rate.pss) : null,
      congestion: rate.congestion ? parseFloat(rate.congestion) : null,
      cleaningFee: rate.cleaningFee ? parseFloat(rate.cleaningFee) : null,
      portCharges: rate.portCharges ? parseFloat(rate.portCharges) : null,
      warehouse: rate.warehouse ? parseFloat(rate.warehouse) : null,
      insurance: rate.insurance ? parseFloat(rate.insurance) : null,
      otherCharges: rate.otherCharges ? parseFloat(rate.otherCharges) : null,
      otherChargesDesc: rate.otherChargesDesc,
      transitDaysMin: rate.transitDaysMin ? parseInt(rate.transitDaysMin) : null,
      transitDaysMax: rate.transitDaysMax ? parseInt(rate.transitDaysMax) : null,
      frequency: rate.frequency,
      commodity: rate.commodity,
      notes: rate.notes,
    },
  })

  return NextResponse.json(newRate, { status: 201 })
}
