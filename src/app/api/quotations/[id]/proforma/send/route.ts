import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDocumentEmail } from '@/lib/email'
import ProformaInvoicePdf from '@/components/pdf/ProformaInvoicePdf'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = await prisma.quotation.findUnique({ where: { id: params.id } })
  if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!q.customerEmail) return NextResponse.json({ error: 'Esta proforma no tiene email del cliente.' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (renderToBuffer as any)(
    createElement(ProformaInvoicePdf, {
      number: q.number,
      issueDate: q.issueDate.toISOString(),
      customerName: q.customerName,
      customerEmail: q.customerEmail,
      customerPhone: q.customerPhone,
      originPort: q.originPort,
      destinationPort: q.destinationPort,
      mode: q.mode,
      incoterm: q.incoterm,
      cbm: q.cbm ? Number(q.cbm) : null,
      containers: q.containers,
      intlCharges: q.intlCharges as { label: string; amount: number }[],
      localCharges: q.localCharges as { label: string; amount: number }[],
      otherCharges: q.otherCharges as { label: string; amount: number }[],
      intlTotal: Number(q.intlTotal),
      localTotal: Number(q.localTotal),
      otherTotal: Number(q.otherTotal),
      grandTotal: Number(q.grandTotal),
    })
  )

  const sent = await sendDocumentEmail({
    to: q.customerEmail,
    customerName: q.customerName,
    subject: `[GTL] Proforma ${q.number}`,
    documentLabel: `Proforma ${q.number}`,
    message: 'Le compartimos su proforma adjunta para revisión y pago.',
    filename: `proforma-${q.number}.pdf`,
    pdf: buffer,
  })

  if (!sent) return NextResponse.json({ error: 'No se pudo enviar. Revisa la configuración de email en Ajustes.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
