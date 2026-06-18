import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { QuoteStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QuotationStatusBadge from '@/components/QuotationStatusBadge'
import { QuotationProformaActions, ServiceInvoiceActions } from './InvoiceRowActions'

const COLLECTABLE_STATUSES: QuoteStatus[] = [
  'ENVIADA',
  'APROBADA',
  'EN_TRANSITO',
  'ARRIBO',
  'EN_ADUANA',
  'NACIONALIZACION',
  'ENTREGADA',
]

export default async function InvoicesPage({ searchParams }: { searchParams: { view?: string; search?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const view = searchParams.view ?? 'services'
  const search = searchParams.search

  const serviceWhere = search ? {
    OR: [
      { number: { contains: search, mode: 'insensitive' as const } },
      { customerName: { contains: search, mode: 'insensitive' as const } },
      { customerEmail: { contains: search, mode: 'insensitive' as const } },
      { serviceTag: { contains: search, mode: 'insensitive' as const } },
    ],
  } : {}

  const quotationWhere = {
    status: { in: COLLECTABLE_STATUSES },
    ...(search ? {
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } },
        { customerName: { contains: search, mode: 'insensitive' as const } },
        { customerEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [serviceInvoices, quotationInvoices, serviceCount, quotationCount] = await Promise.all([
    prisma.serviceInvoice.findMany({
      where: serviceWhere,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.quotation.findMany({
      where: quotationWhere,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.serviceInvoice.count(),
    prisma.quotation.count({ where: { status: { in: COLLECTABLE_STATUSES } } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas y Cobros</h1>
          <p className="text-gray-500 text-sm mt-0.5">Facturas independientes por servicio y cobros derivados de cotizaciones.</p>
        </div>
        <Link href="/invoices/new" className="bg-gtl-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors">
          + Factura de servicio
        </Link>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
        Estos PDF sirven como documentos de cobro operativos. Para factura electrónica SRI real se debe conectar luego un proveedor autorizado.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex overflow-x-auto">
            <Link href={`/invoices?view=services${search ? `&search=${search}` : ''}`}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${view === 'services' ? 'border-gtl-navy text-gtl-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Servicios <span className="ml-1 text-xs opacity-60">({serviceCount})</span>
            </Link>
            <Link href={`/invoices?view=quotations${search ? `&search=${search}` : ''}`}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${view === 'quotations' ? 'border-gtl-navy text-gtl-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Desde cotizaciones <span className="ml-1 text-xs opacity-60">({quotationCount})</span>
            </Link>
          </div>
          <form method="GET" action="/invoices" className="py-2">
            <input type="hidden" name="view" value={view} />
            <input name="search" defaultValue={search} placeholder="Buscar cliente, número..." className="w-56 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy" />
          </form>
        </div>

        {view === 'services' ? (
          <ServiceInvoiceTable invoices={serviceInvoices} />
        ) : (
          <QuotationInvoiceTable quotations={quotationInvoices} />
        )}
      </div>
    </div>
  )
}

function ServiceInvoiceTable({ invoices }: { invoices: Awaited<ReturnType<typeof prisma.serviceInvoice.findMany>> }) {
  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-600 font-medium">No hay facturas de servicios.</p>
        <Link href="/invoices/new" className="inline-block mt-3 text-gtl-navy text-sm font-medium hover:underline">Crear primera factura</Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Factura</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">Servicio</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map(invoice => (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gtl-navy font-semibold">{invoice.number}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{invoice.customerName}</div>
                <div className="text-xs text-gray-400">{invoice.customerEmail ?? invoice.customerPhone ?? invoice.customerTaxId ?? 'Sin contacto'}</div>
              </td>
              <td className="px-4 py-3 text-gray-600">{invoice.serviceTag ?? 'Servicios GTL'}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">${Number(invoice.total).toFixed(2)}</td>
              <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">{invoice.status}</span></td>
              <td className="px-4 py-3 text-right">
                <ServiceInvoiceActions invoiceId={invoice.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QuotationInvoiceTable({ quotations }: { quotations: Awaited<ReturnType<typeof prisma.quotation.findMany>> }) {
  if (quotations.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-600 font-medium">No hay cotizaciones listas para cobro.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Documento</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {quotations.map(q => (
            <tr key={q.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-gtl-navy font-semibold">PF-{q.number}</div>
                <Link href={`/quotations/${q.id}`} className="text-xs text-gray-400 hover:underline">{q.number}</Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{q.customerName}</div>
                <div className="text-xs text-gray-400">{q.customerEmail ?? q.customerPhone ?? 'Sin contacto'}</div>
              </td>
              <td className="px-4 py-3"><QuotationStatusBadge status={q.status} /></td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">${Number(q.grandTotal).toFixed(2)}</td>
              <td className="px-4 py-3 text-right">
                <QuotationProformaActions quotationId={q.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
