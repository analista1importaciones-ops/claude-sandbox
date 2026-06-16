'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CourierStatusBadge from '@/components/CourierStatusBadge'

const ALL_STATUSES: { key: string; label: string }[] = [
  { key: 'BORRADOR',    label: 'Borrador'    },
  { key: 'ENVIADA',     label: 'Enviada'     },
  { key: 'APROBADA',    label: 'Aprobada'    },
  { key: 'EN_TRANSITO', label: 'En Tránsito' },
  { key: 'ENTREGADA',   label: 'Entregada'   },
  { key: 'RECHAZADA',   label: 'Rechazada'   },
]

export default function CourierActions({ quotationId, status }: { quotationId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const otherStatuses = ALL_STATUSES.filter(s => s.key !== status)

  async function changeStatus(next: string) {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/courier/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Cambiar estado ▾'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-44">
          {otherStatuses.map(s => (
            <button
              key={s.key}
              onClick={() => changeStatus(s.key)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <CourierStatusBadge status={s.key} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
