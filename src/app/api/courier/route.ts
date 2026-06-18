import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queueOrSendWorkflowMessage } from '@/lib/workflows'

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
  const userId = (session.user as { id: string }).id

  const number = await generateCourierNumber()

  const quotation = await prisma.courierQuotation.create({
    data: {
      number,
      createdById: userId,
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

  const contactLookup = [
    ...(body.customerEmail ? [{ email: body.customerEmail }] : []),
    ...(body.customerPhone ? [{ phone: body.customerPhone }] : []),
  ]

  if (contactLookup.length > 0) {
    const existingContact = await prisma.contact.findFirst({
      where: { OR: contactLookup },
      select: { id: true, tags: true, phone: true },
    })

    const contact = existingContact
      ? await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            name: body.customerName,
            email: body.customerEmail || undefined,
            phone: body.customerPhone || undefined,
            serviceLabel: 'COURIER',
            tags: Array.from(new Set([...(existingContact.tags ?? []), 'Courier', 'Cotizado'])),
          },
        })
      : await prisma.contact.create({
          data: {
            name: body.customerName,
            email: body.customerEmail || null,
            phone: body.customerPhone || null,
            source: 'OTRO',
            serviceLabel: 'COURIER',
            assignedToId: userId,
            tags: ['Courier', 'Cotizado'],
          },
        })

    const deal = await prisma.deal.create({
      data: {
        contactId: contact.id,
        stage: 'COTIZADO',
        estimatedValue: body.selectedPriceUsd ? parseFloat(body.selectedPriceUsd) : null,
        currency: 'USD',
        notes: `Cotización courier ${quotation.number}`,
      },
    })

    const workflows = await prisma.workflow.findMany({
      where: { active: true, trigger: 'DEAL_STAGE_CHANGED', stage: 'COTIZADO' },
      include: { template: true },
    })

    await Promise.all(workflows.map(workflow =>
      queueOrSendWorkflowMessage(workflow, contact).catch(error => {
        console.error('[Courier workflow] send failed', error)
      })
    ))
  }

  return NextResponse.json(quotation, { status: 201 })
}
