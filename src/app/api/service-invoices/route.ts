import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateServiceInvoiceTotals, normalizeServiceInvoiceItems } from '@/lib/serviceInvoices'

async function generateInvoiceNumber() {
  const count = await prisma.serviceInvoice.count()
  return `FS-${String(count + 1).padStart(5, '0')}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoices = await prisma.serviceInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const items = normalizeServiceInvoiceItems(body.items ?? [])
  if (!body.customerName || items.length === 0) {
    return NextResponse.json({ error: 'Cliente e items son requeridos' }, { status: 400 })
  }

  const { subtotal, ivaTotal, total } = calculateServiceInvoiceTotals(items)

  const invoice = await prisma.serviceInvoice.create({
    data: {
      number: await generateInvoiceNumber(),
      createdById: session.user.id,
      contactId: body.contactId || null,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      customerTaxId: body.customerTaxId || null,
      customerAddress: body.customerAddress || null,
      serviceTag: body.serviceTag || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      currency: body.currency || 'USD',
      items,
      subtotal,
      ivaTotal,
      total,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
