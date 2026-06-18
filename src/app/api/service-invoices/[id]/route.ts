import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateServiceInvoiceTotals, normalizeServiceInvoiceItems } from '@/lib/serviceInvoices'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.serviceInvoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(invoice)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.status && Object.keys(body).length === 1) {
    const invoice = await prisma.serviceInvoice.update({
      where: { id: params.id },
      data: { status: body.status },
    })
    return NextResponse.json(invoice)
  }

  const items = normalizeServiceInvoiceItems(body.items ?? [])
  if (!body.customerName || items.length === 0) {
    return NextResponse.json({ error: 'Cliente e items son requeridos' }, { status: 400 })
  }

  const { subtotal, ivaTotal, total } = calculateServiceInvoiceTotals(items)
  const invoice = await prisma.serviceInvoice.update({
    where: { id: params.id },
    data: {
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

  return NextResponse.json(invoice)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.serviceInvoice.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
