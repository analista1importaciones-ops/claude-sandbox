'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  DRAFT: [{ label: 'Marcar como Enviada', next: 'SENT' }, { label: 'Archivar', next: 'ARCHIVED' }],
  SENT: [{ label: 'Archivar', next: 'ARCHIVED' }],
  ARCHIVED: [{ label: 'Restaurar a Borrador', next: 'DRAFT' }],
}

export default function QuotationActions({ quotationId, status }: { quotationId: string; status: string }) {

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const transitions = STATUS_TRANSITIONS[status] ?? []

  async function changeStatus(next: string) {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setLoading(false)
    router.refresh()
  }

  function downloadPdf() {
    window.open(`/api/quotations/${quotationId}/pdf`, '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/quotations/${quotationId}/edit`}
        className="flex items-center gap-1.5 px-3 py-2 border border-gtl-navy text-gtl-navy rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Editar
      </Link>
      <button onClick={downloadPdf}
        className="flex items-center gap-1.5 px-3 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        Descargar PDF
      </button>

      {transitions.length > 0 && (
        <div className="relative">
          <button onClick={() => setOpen(!open)} disabled={loading}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {loading ? '...' : 'Acciones ▾'}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-48">
              {transitions.map(t => (
                <button key={t.next} onClick={() => changeStatus(t.next)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
