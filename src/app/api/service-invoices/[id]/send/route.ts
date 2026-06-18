import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email'
import ServiceInvoicePdf from '@/components/pdf/ServiceInvoicePdf'

type ServiceInvoiceItem = {
  description: string
  quantity: number
  unitPrice: number
  appliesIva: boolean
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.serviceInvoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!invoice.customerEmail) return NextResponse.json({ error: 'Esta factura no tiene email del cliente.' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (renderToBuffer as any)(
    createElement(ServiceInvoicePdf, {
      number: invoice.number,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      customerTaxId: invoice.customerTaxId,
      customerAddress: invoice.customerAddress,
      serviceTag: invoice.serviceTag,
      currency: invoice.currency,
      items: invoice.items as ServiceInvoiceItem[],
      subtotal: Number(invoice.subtotal),
      ivaTotal: Number(invoice.ivaTotal),
      total: Number(invoice.total),
      notes: invoice.notes,
    })
  )

  const sent = await sendDocumentEmail({
    to: invoice.customerEmail,
    customerName: invoice.customerName,
    subject: `[GTL] Factura ${invoice.number}`,
    documentLabel: `Factura ${invoice.number}`,
    message: 'Le compartimos su factura de servicio adjunta para revisión y pago.',
    filename: `${invoice.number}.pdf`,
    pdf: buffer,
  })

  if (!sent) return NextResponse.json({ error: 'No se pudo enviar. Revisa la configuración de email en Ajustes.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
