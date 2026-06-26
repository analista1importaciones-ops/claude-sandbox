import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureWhatsAppReady } from '@/lib/whatsapp'
import { ensureWAMediaDir } from '@/lib/wa-media'
import QuotationPdf from '@/components/pdf/QuotationPdf'
import ProformaInvoicePdf from '@/components/pdf/ProformaInvoicePdf'

function normalizeRecipient(to: string) {
  if (to.includes('@')) return to
  let digits = to.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) digits = `593${digits.slice(1)}`
  if (digits.startsWith('9') && digits.length === 9) digits = `593${digits}`
  return `${digits}@s.whatsapp.net`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const documentType = body.type === 'proforma' ? 'proforma' : 'quotation'
  const customMessage = String(body.message || '').trim()

  const q = await prisma.quotation.findUnique({ where: { id: params.id } })
  if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!q.customerPhone) return NextResponse.json({ error: 'La cotización no tiene teléfono del cliente.' }, { status: 400 })

  const commonProps = {
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
  }

  const pdfElement = documentType === 'proforma'
    ? createElement(ProformaInvoicePdf, commonProps)
    : createElement(QuotationPdf, {
      ...commonProps,
      validUntil: q.validUntil.toISOString(),
      originCountry: q.originCountry,
      currency: q.currency,
      transitDaysMin: q.transitDaysMin,
      transitDaysMax: q.transitDaysMax,
      frequency: q.frequency,
      productDesc: q.productDesc,
      notes: q.notes,
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (renderToBuffer as any)(pdfElement) as Buffer
  const filename = documentType === 'proforma' ? `proforma-${q.number}.pdf` : `${q.number}.pdf`
  const label = documentType === 'proforma' ? 'proforma' : 'cotización'
  const caption = customMessage || `Hola ${q.customerName}, te comparto la ${label} ${q.number} para tu revisión.`

  const sock = await ensureWhatsAppReady().catch(error => {
    console.error('[Quotation WhatsApp] ensure failed:', error)
    return null
  })
  if (!sock) return NextResponse.json({ error: 'WhatsApp no conectado.' }, { status: 400 })

  const jid = normalizeRecipient(q.customerPhone)
  const sent = await sock.sendMessage(jid, {
    document: pdf,
    mimetype: 'application/pdf',
    fileName: filename,
    caption,
  })

  const mediaDir = ensureWAMediaDir()
  const storedName = `${sent?.key?.id ?? Date.now()}-${filename}`
  fs.writeFileSync(path.join(mediaDir, storedName), pdf)

  const contact = await prisma.contact.findFirst({
    where: { phone: { contains: q.customerPhone.replace(/\D/g, '').slice(-8) } },
    select: { id: true },
  })

  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: jid,
      fromMe: true,
      content: caption,
      messageId: sent?.key?.id ?? `quote-${q.id}-${Date.now()}`,
      timestamp: new Date(),
      contactId: contact?.id ?? null,
      mediaUrl: `/wa-media/${storedName}`,
      mediaType: 'document',
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true, jid })
}
