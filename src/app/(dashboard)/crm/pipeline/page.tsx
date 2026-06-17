'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STAGES = [
  { key: 'PAUTA', label: 'Pauta', color: 'border-t-gray-400' },
  { key: 'CONTACTADO', label: 'Contactado', color: 'border-t-blue-400' },
  { key: 'COTIZADO', label: 'Cotizado', color: 'border-t-yellow-400' },
  { key: 'SEGUIMIENTO', label: 'Seguimiento', color: 'border-t-orange-400' },
  { key: 'NEGOCIANDO', label: 'Negociando', color: 'border-t-purple-400' },
  { key: 'CERRADO_GANADO', label: 'Cerrado/Ganado', color: 'border-t-green-500' },
  { key: 'PERDIDO', label: 'Perdido', color: 'border-t-red-400' },
]

interface Deal {
  id: string
  stage: string
  estimatedValue: string | null
  currency: string
  contact: { id: string; name: string; company: string | null }
  quotation: { number: string } | null
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/crm/deals')
    const data = await res.json()
    setDeals(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function moveToStage(dealId: string, stage: string) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage } : d))
    )
    await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function onDrop(e: React.DragEvent, stage: string) {
    e.preventDefault()
    if (dragging) moveToStage(dragging, stage)
    setDragging(null)
  }

  const byStage = (stage: string) => deals.filter((d) => d.stage === stage)

  const totalByStage = (stage: string) =>
    byStage(stage).reduce((acc, d) => acc + (d.estimatedValue ? parseFloat(d.estimatedValue) : 0), 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">{deals.length} oportunidades en total</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/crm"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver Contactos
          </Link>
          <Link
            href="/crm/contacts/new"
            className="px-4 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            + Nuevo Contacto
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando pipeline...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = byStage(stage.key)
              const total = totalByStage(stage.key)
              return (
                <div
                  key={stage.key}
                  className="w-60 flex flex-col"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, stage.key)}
                >
                  <div className={`bg-white rounded-t-xl border-t-4 ${stage.color} border-x border-gray-100 px-3 py-3`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-sm">{stage.label}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    {total > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        USD {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-b-xl border-x border-b border-gray-100 p-2 space-y-2 min-h-[400px]">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragging(deal.id)}
                        onDragEnd={() => setDragging(null)}
                        className={`bg-white rounded-lg border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                          dragging === deal.id ? 'opacity-50' : ''
                        }`}
                      >
                        <Link
                          href={`/crm/contacts/${deal.contact.id}`}
                          className="font-medium text-sm text-gray-900 hover:text-gtl-orange block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deal.contact.name}
                        </Link>
                        {deal.contact.company && (
                          <p className="text-xs text-gray-400 mt-0.5">{deal.contact.company}</p>
                        )}
                        {deal.estimatedValue && (
                          <p className="text-xs font-semibold text-gtl-orange mt-1.5">
                            {deal.currency} {parseFloat(deal.estimatedValue).toLocaleString()}
                          </p>
                        )}
                        {deal.quotation && (
                          <p className="text-xs text-gray-400 mt-1">{deal.quotation.number}</p>
                        )}
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-gray-300 text-center pt-8">Arrastra aquí</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
