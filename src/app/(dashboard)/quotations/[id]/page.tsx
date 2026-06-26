import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QuotationActions from './QuotationActions'
import QuotationWhatsAppPanel from './QuotationWhatsAppPanel'
import QuotationStatusBadge from '@/components/QuotationStatusBadge'
import QuotationTimeline from '@/components/QuotationTimeline'

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

type LineItem = { label: string; amount: number }

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const q = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true } },
      rate: { include: { rateSheet: { include: { carrier: true } } } },
    },
  })
  if (!q) notFound()

  const contactLookup = [
    ...(q.customerEmail ? [{ email: q.customerEmail }] : []),
    ...(q.customerPhone ? [{ phone: q.customerPhone }] : []),
  ]
  const contact = contactLookup.length > 0
    ? await prisma.contact.findFirst({
        where: { OR: contactLookup },
        select: { id: true },
      })
    : null

  const intlCharges = q.intlCharges as LineItem[]
  const localCharges = q.localCharges as LineItem[]
  const otherCharges = q.otherCharges as LineItem[]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/quotations" className="hover:text-gray-600">Cotizaciones</Link>
        <span>/</span>
        <span className="text-gray-600 font-mono">{q.number}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{q.number}</h1>
              <QuotationStatusBadge status={q.status} />
            </div>
            <p className="text-gray-500 text-sm mt-1">{q.customerName} · {q.originPort} → {q.destinationPort} · {modeLabels[q.mode] ?? q.mode}</p>
          </div>
          <QuotationActions quotationId={q.id} status={q.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-400 block text-xs">Emisión</span><span className="font-medium">{q.issueDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div><span className="text-gray-400 block text-xs">Válida hasta</span><span className="font-medium">{q.validUntil.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div><span className="text-gray-400 block text-xs">Incoterm</span><span className="font-medium">{q.incoterm}</span></div>
          <div><span className="text-gray-400 block text-xs">Moneda</span><span className="font-medium">{q.currency}</span></div>
        </div>

        {(q.cbm || q.containers || q.grossWeightKg || q.productDesc) && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {q.cbm && <span className="text-gray-600">Volumen: <strong>{Number(q.cbm).toFixed(3)} CBM</strong></span>}
            {q.containers && <span className="text-gray-600">Contenedores: <strong>{q.containers}</strong></span>}
            {q.grossWeightKg && <span className="text-gray-600">Peso: <strong>{Number(q.grossWeightKg).toFixed(0)} kg</strong></span>}
            {q.productDesc && <span className="text-gray-600">Carga: <strong>{q.productDesc}</strong></span>}
          </div>
        )}

        {q.transitDaysMin && q.transitDaysMax && (
          <div className="mt-2 text-sm text-gray-500">Tránsito estimado: {q.transitDaysMin}–{q.transitDaysMax} días{q.frequency ? ` · ${q.frequency}` : ''}</div>
        )}

        {q.rate && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            Tarifa base: <Link href={`/rates/${q.rate.id}`} className="text-gtl-navy hover:underline">{q.rate.rateSheet.carrier.name} · {q.rate.rateSheet.reference}</Link>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase mb-1">Progreso del envío</h2>
        <QuotationTimeline status={q.status} />
      </div>

      {/* Client */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Cliente</h2>
          {contact && (
            <Link href={`/crm/contacts/${contact.id}`} className="text-xs font-medium text-gtl-navy hover:underline">
              Ver perfil CRM →
            </Link>
          )}
        </div>
        <div className="text-sm space-y-1">
          <div className="font-semibold text-gray-900">{q.customerName}</div>
          {q.customerEmail && <div className="text-gray-500">{q.customerEmail}</div>}
          {q.customerPhone && <div className="text-gray-500">{q.customerPhone}</div>}
        </div>
      </div>

      {/* Charges */}
      <div className="space-y-4 mb-4">
        <ChargesTable title="Bloque 1 — Transporte Internacional" items={intlCharges} subtotal={Number(q.intlTotal)} currency={q.currency} />
        <ChargesTable title="Bloque 2 — Gastos Locales GTL" items={localCharges} subtotal={Number(q.localTotal)} currency={q.currency} accent="orange" />
        <ChargesTable title="Bloque 3 — Otros Costos" items={otherCharges} subtotal={Number(q.otherTotal)} currency={q.currency} accent="gray" />
      </div>

      {/* Total */}
      <div className="bg-gtl-navy rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold text-sm uppercase tracking-wide">Total General</div>
            <div className="text-blue-300 text-xs mt-0.5">{q.currency} · Todos los bloques incluidos</div>
          </div>
          <div className="text-3xl font-bold text-white font-mono">${Number(q.grandTotal).toFixed(2)}</div>
        </div>
      </div>

      {/* Notes */}
      {q.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Observaciones</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 pb-8 text-center">Generado por GTL Rate Manager · {q.createdBy.name}</div>
      <QuotationWhatsAppPanel
        quotationId={q.id}
        number={q.number}
        customerName={q.customerName}
        customerPhone={q.customerPhone}
        grandTotal={Number(q.grandTotal)}
        currency={q.currency}
      />
    </div>
  )
}

function ChargesTable({ title, items, subtotal, currency, accent = 'navy' }: {
  title: string; items: LineItem[]; subtotal: number; currency: string; accent?: 'navy' | 'orange' | 'gray'
}) {
  const headerColor = accent === 'orange' ? 'text-gtl-orange' : accent === 'gray' ? 'text-gray-500' : 'text-gtl-navy'
  const subtotalColor = accent === 'orange' ? 'text-gtl-orange' : accent === 'gray' ? 'text-gray-600' : 'text-gtl-navy'
  const dotColor = accent === 'orange' ? 'bg-gtl-orange' : accent === 'gray' ? 'bg-gray-400' : 'bg-gtl-navy'

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${headerColor}`}>{title}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center px-5 py-2.5 text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-mono text-gray-900 font-medium">${Number(item.amount).toFixed(2)}</span>
          </div>
        ))}
        <div className={`flex justify-between items-center px-5 py-3 bg-gray-50`}>
          <span className={`text-xs font-bold uppercase ${subtotalColor}`}>Subtotal</span>
          <span className={`font-mono font-bold ${subtotalColor}`}>${subtotal.toFixed(2)} {currency}</span>
        </div>
      </div>
    </div>
  )
}
