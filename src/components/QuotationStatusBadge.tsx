import React from 'react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  BORRADOR:       { label: 'Borrador',       bg: 'bg-gray-100',   text: 'text-gray-600'   },
  ENVIADA:        { label: 'Enviada',         bg: 'bg-blue-100',   text: 'text-blue-700'   },
  APROBADA:       { label: 'Aprobada',        bg: 'bg-green-100',  text: 'text-green-700'  },
  EN_TRANSITO:    { label: 'En Tránsito',     bg: 'bg-indigo-100', text: 'text-indigo-700' },
  ARRIBO:         { label: 'Arribo',          bg: 'bg-purple-100', text: 'text-purple-700' },
  EN_ADUANA:      { label: 'En Aduana',       bg: 'bg-amber-100',  text: 'text-amber-700'  },
  NACIONALIZACION:{ label: 'Nacionalización', bg: 'bg-orange-100', text: 'text-orange-700' },
  ENTREGADA:      { label: 'Entregada',       bg: 'bg-emerald-100',text: 'text-emerald-700'},
  RECHAZADA:      { label: 'Rechazada',       bg: 'bg-red-100',    text: 'text-red-700'    },
}

export default function QuotationStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['BORRADOR']
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}
