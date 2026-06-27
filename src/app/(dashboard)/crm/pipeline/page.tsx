'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface FunnelStage {
  id: string
  name: string
  order: number
  color: string
}

interface Funnel {
  id: string
  name: string
  stages: FunnelStage[]
  _count?: { deals: number; workflows: number }
}

interface Deal {
  id: string
  stage: string
  funnelId: string | null
  funnelStageId: string | null
  estimatedValue: string | null
  currency: string
  funnelStage: FunnelStage | null
  contact: {
    id: string
    name: string
    company: string | null
    phone: string | null
    tags: string[]
    _count: { activities: number; whatsappMessages: number; appointments: number }
  }
  quotation: { number: string } | null
}

export default function PipelinePage() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [activeFunnelId, setActiveFunnelId] = useState<string>('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  const activeFunnel = useMemo(
    () => funnels.find(funnel => funnel.id === activeFunnelId) ?? funnels[0] ?? null,
    [funnels, activeFunnelId]
  )

  async function loadFunnels() {
    const res = await fetch('/api/crm/funnels')
    if (!res.ok) return
    const data = await res.json()
    setFunnels(data)
    setActiveFunnelId(current => current || data.find((funnel: Funnel) => funnel.name === 'CARGAS')?.id || data[0]?.id || '')
  }

  async function loadDeals(funnelId = activeFunnelId) {
    if (!funnelId) return
    setLoading(true)
    const res = await fetch(`/api/crm/deals?funnelId=${encodeURIComponent(funnelId)}`)
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadFunnels() }, [])
  useEffect(() => { if (activeFunnelId) loadDeals(activeFunnelId) }, [activeFunnelId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function moveToStage(dealId: string, funnelStage: FunnelStage) {
    const current = deals.find((d) => d.id === dealId)
    if (current?.funnelStageId === funnelStage.id) return
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, funnelId: activeFunnelId, funnelStageId: funnelStage.id, funnelStage } : d))
    )
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnelStageId: funnelStage.id }),
    })
    if (!res.ok) loadDeals()
  }

  function onDrop(e: React.DragEvent, stage: FunnelStage) {
    e.preventDefault()
    if (dragging) moveToStage(dragging, stage)
    setDragging(null)
  }

  const byStage = (stageId: string) => deals.filter((deal) => deal.funnelStageId === stageId)
  const totalByStage = (stageId: string) =>
    byStage(stageId).reduce((acc, d) => acc + (d.estimatedValue ? parseFloat(d.estimatedValue) : 0), 0)

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes Potenciales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeFunnel ? `${deals.length} oportunidades en ${activeFunnel.name}` : 'Embudo comercial'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/crm" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Ver Contactos
          </Link>
          <Link href="/crm/contacts/new" className="px-4 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600">
            + Nuevo Contacto
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {funnels.map(funnel => (
          <button
            key={funnel.id}
            onClick={() => setActiveFunnelId(funnel.id)}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${
              activeFunnelId === funnel.id
                ? 'border-gtl-orange bg-orange-50 text-gtl-orange'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {funnel.name}
            <span className="ml-2 text-xs text-gray-400">{funnel._count?.deals ?? 0}</span>
          </button>
        ))}
      </div>

      {!activeFunnel ? (
        <div className="py-12 text-center text-gray-400">No hay embudos configurados.</div>
      ) : loading ? (
        <div className="py-12 text-center text-gray-400">Cargando pipeline...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {activeFunnel.stages.map((stage) => {
              const stageDeals = byStage(stage.id)
              const total = totalByStage(stage.id)
              return (
                <div
                  key={stage.id}
                  className="w-72 flex flex-col"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, stage)}
                >
                  <div className="bg-white rounded-t-lg border-x border-gray-200 px-3 py-3 shadow-sm border-t-4" style={{ borderTopColor: stage.color }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-sm">{stage.name}</span>
                      <span className="text-xs font-semibold text-gray-700">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stageDeals.length} oportunidad{stageDeals.length !== 1 ? 'es' : ''}</p>
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-b-lg border-x border-b border-gray-200 p-2 space-y-2 min-h-[520px]">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragging(deal.id)}
                        onDragEnd={() => setDragging(null)}
                        className={`bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                          dragging === deal.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/crm/contacts/${deal.contact.id}`} className="font-semibold text-sm text-gray-900 hover:text-gtl-orange block" onClick={(e) => e.stopPropagation()}>
                            {deal.contact.name}
                          </Link>
                          {deal.quotation && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{deal.quotation.number}</span>}
                        </div>
                        {deal.contact.company && <p className="text-xs text-gray-400 mt-0.5">{deal.contact.company}</p>}
                        {deal.contact.phone && <p className="text-xs text-gray-500 mt-1">{deal.contact.phone}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">Valor:</span>
                          <span className="text-xs font-medium text-gray-700">
                            {deal.estimatedValue ? `${deal.currency} ${parseFloat(deal.estimatedValue).toLocaleString()}` : '$0.00'}
                          </span>
                        </div>
                        {deal.contact.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {deal.contact.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                          <span title="WhatsApp">Chat {deal.contact._count.whatsappMessages}</span>
                          <span title="Actividades">Act {deal.contact._count.activities}</span>
                          <span title="Citas">Citas {deal.contact._count.appointments}</span>
                        </div>
                        <div className="mt-3 md:hidden">
                          <label className="block text-[10px] font-medium uppercase text-gray-400 mb-1">Mover a etapa</label>
                          <select
                            value={deal.funnelStageId ?? ''}
                            onChange={(event) => {
                              const destination = activeFunnel.stages.find(item => item.id === event.target.value)
                              if (destination) moveToStage(deal.id, destination)
                            }}
                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700"
                          >
                            {activeFunnel.stages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-gray-300 text-center pt-8">Arrastra aqui</p>
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
