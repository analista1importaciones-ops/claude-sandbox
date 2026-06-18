'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ServiceInvoiceActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  async function deleteInvoice() {
    if (!confirm('¿Eliminar esta factura de servicio? Esta acción no se puede deshacer.')) return
    setLoading(true)
    await fetch(`/api/service-invoices/${invoiceId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function sendInvoice() {
    if (!confirm('¿Enviar esta factura al email del cliente?')) return
    setSending(true)
    const res = await fetch(`/api/service-invoices/${invoiceId}/send`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    alert(res.ok ? 'Factura enviada al cliente.' : (data.error ?? 'No se pudo enviar la factura.'))
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <a href={`/api/service-invoices/${invoiceId}/pdf`} target="_blank" className="inline-flex px-3 py-1.5 bg-gtl-orange text-white rounded-lg text-xs font-medium hover:bg-orange-600">
        PDF
      </a>
      <Link href={`/invoices/${invoiceId}/edit`} className="inline-flex px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
        Editar
      </Link>
      <button onClick={sendInvoice} disabled={sending} className="inline-flex px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-50">
        {sending ? 'Enviando...' : 'Enviar'}
      </button>
      <button onClick={deleteInvoice} disabled={loading} className="inline-flex px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
        Eliminar
      </button>
    </div>
  )
}

export function QuotationProformaActions({ quotationId }: { quotationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  async function removeFromCollections() {
    if (!confirm('¿Quitar esta proforma de la lista de cobros? La cotización volverá a Borrador.')) return
    setLoading(true)
    await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'BORRADOR', silent: true }),
    })
    router.refresh()
  }

  async function sendProforma() {
    if (!confirm('¿Enviar esta proforma al email del cliente?')) return
    setSending(true)
    const res = await fetch(`/api/quotations/${quotationId}/proforma/send`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    alert(res.ok ? 'Proforma enviada al cliente.' : (data.error ?? 'No se pudo enviar la proforma.'))
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <a href={`/api/quotations/${quotationId}/proforma`} target="_blank" className="inline-flex px-3 py-1.5 bg-gtl-orange text-white rounded-lg text-xs font-medium hover:bg-orange-600">
        PDF
      </a>
      <Link href={`/quotations/${quotationId}`} className="inline-flex px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
        Ver
      </Link>
      <button onClick={sendProforma} disabled={sending} className="inline-flex px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-50">
        {sending ? 'Enviando...' : 'Enviar'}
      </button>
      <button onClick={removeFromCollections} disabled={loading} className="inline-flex px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
        Quitar
      </button>
    </div>
  )
}
