import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import QuotationPdf from '@/components/pdf/QuotationPdf'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = await prisma.quotation.findUnique({ where: { id: params.id } })
  if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (renderToBuffer as any)(
    createElement(QuotationPdf, {
      number: q.number,
      issueDate: q.issueDate.toISOString(),
      validUntil: q.validUntil.toISOString(),
      customerName: q.customerName,
      customerEmail: q.customerEmail,
      customerPhone: q.customerPhone,
      originPort: q.originPort,
      destinationPort: q.destinationPort,
      originCountry: q.originCountry,
      mode: q.mode,
      incoterm: q.incoterm,
      currency: q.currency,
      cbm: q.cbm ? Number(q.cbm) : null,
      containers: q.containers,
      transitDaysMin: q.transitDaysMin,
      transitDaysMax: q.transitDaysMax,
      frequency: q.frequency,
      productDesc: q.productDesc,
      intlCharges: q.intlCharges as { label: string; amount: number }[],
      localCharges: q.localCharges as { label: string; amount: number }[],
      otherCharges: q.otherCharges as { label: string; amount: number }[],
      intlTotal: Number(q.intlTotal),
      localTotal: Number(q.localTotal),
      otherTotal: Number(q.otherTotal),
      grandTotal: Number(q.grandTotal),
      notes: q.notes,
    })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${q.number}.pdf"`,
    },
  })
}
