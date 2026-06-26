'use client'

import { useMemo, useState } from 'react'

type Props = {
  quotationId: string
  number: string
  customerName: string
  customerPhone: string | null
  grandTotal: number
  currency: string
}

export default function QuotationWhatsAppPanel({
  quotationId,
  number,
  customerName,
  customerPhone,
  grandTotal,
  currency,
}: Props) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState<'quotation' | 'proforma' | null>(null)
  const [message, setMessage] = useState(() =>
    `Hola ${customerName}, te comparto la cotización ${number} por ${currency} ${grandTotal.toFixed(2)} para tu revisión.`
  )

  const phoneLabel = useMemo(() => customerPhone || 'Sin teléfono', [customerPhone])

  async function send(type: 'quotation' | 'proforma') {
    if (!customerPhone) {
      alert('Esta cotización no tiene teléfono del cliente.')
      return
    }
    setSending(type)
    try {
      const res = await fetch(`/api/quotations/${quotationId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar por WhatsApp.')
      alert(type === 'proforma' ? 'Proforma enviada por WhatsApp.' : 'Cotización enviada por WhatsApp.')
      setOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo enviar por WhatsApp.')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm">
      {open ? (
        <div className="rounded-lg border border-green-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Enviar por WhatsApp</p>
              <p className="text-xs text-gray-500">{customerName} · {phoneLabel}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-700">Cerrar</button>
          </div>
          <div className="space-y-3 px-4 py-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Mensaje para el cliente"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => send('quotation')}
                disabled={Boolean(sending) || !customerPhone}
                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sending === 'quotation' ? 'Enviando...' : 'Enviar cotización'}
              </button>
              <button
                onClick={() => send('proforma')}
                disabled={Boolean(sending) || !customerPhone}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {sending === 'proforma' ? 'Enviando...' : 'Enviar proforma'}
              </button>
            </div>
            {!customerPhone && (
              <p className="text-xs text-amber-600">Agrega el teléfono del cliente para enviar por WhatsApp.</p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-green-700"
        >
          WhatsApp cotización
        </button>
      )}
    </div>
  )
}
