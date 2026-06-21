'use client'

import { useEffect, useMemo, useState } from 'react'
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

const FUNNELS = [
  { key: 'todos', label: 'Todos' },
  { key: 'cursos', label: 'Cursos' },
  { key: 'cargas', label: 'Cargas' },
  { key: 'asesorias', label: 'Asesorías' },
  { key: 'inspecciones', label: 'Inspecciones' },
  { key: 'proveedores', label: 'Proveedores' },
]

const SERVICE_LABELS: Record<string, string> = {
  CURSOS: 'Cursos',
  CARGA: 'Carga',
  ASESORIAS: 'Asesorías',
  INSPECCIONES: 'Inspecciones',
  BUSQUEDA_PROVEEDORES: 'Búsqueda de proveedores',
  COURIER: 'Courier',
  NACIONALIZACION: 'Nacionalización',
  TRANSPORTE_PESADO: 'Transporte pesado',
  SEGURO_CARGA: 'Seguro de carga',
  OTRO: 'Otro',
}

interface Deal {
  id: string
  stage: string
  estimatedValue: string | null
  currency: string
  contact: {
    id: string
    name: string
    company: string | null
    phone: string | null
    tags: string[]
    serviceLabel: string
    _count: { activities: number; whatsappMessages: number; appointments: number }
  }
  quotation: { number: string } | null
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [activeFunnel, setActiveFunnel] = useState('todos')
  const [activeStage, setActiveStage] = useState('PAUTA')

  async function load(funnel = activeFunnel) {
    setLoading(true)
    const res = await fetch(`/api/crm/deals?funnel=${funnel}`)
    const data = await res.json()
    setDeals(data)
    setLoading(false)
  }

  useEffect(() => { load(activeFunnel) }, [activeFunnel])

  async function moveToStage(dealId: string, stage: string) {
    const current = deals.find((d) => d.id === dealId)
    if (current?.stage === stage) return
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage } : d))
    )
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, funnel: activeFunnel }),
    })
    if (!res.ok) load()
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

  const activeFunnelLabel = useMemo(
    () => FUNNELS.find((funnel) => funnel.key === activeFunnel)?.label ?? 'Todos',
    [activeFunnel]
  )

  const renderDealCard = (deal: Deal, compact = false) => (
    <div
      key={deal.id}
      draggable={!compact}
      onDragStart={() => !compact && setDragging(deal.id)}
      onDragEnd={() => setDragging(null)}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-3 transition-opacity ${
        compact ? '' : `cursor-grab active:cursor-grabbing ${dragging === deal.id ? 'opacity-50' : ''}`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/crm/contacts/${deal.contact.id}`}
          className="font-semibold text-sm text-gray-900 hover:text-gtl-orange block"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.contact.name}
        </Link>
        {deal.quotation && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{deal.quotation.number}</span>}
      </div>
      {deal.contact.company && <p className="text-xs text-gray-400 mt-0.5">{deal.contact.company}</p>}
      {deal.contact.phone && <p className="text-xs text-gray-500 mt-1">{deal.contact.phone}</p>}
      {deal.contact.serviceLabel && deal.contact.serviceLabel !== 'OTRO' && (
        <p className="text-[10px] text-blue-600 mt-1">{SERVICE_LABELS[deal.contact.serviceLabel] ?? deal.contact.serviceLabel}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">Valor:</span>
        <span className="text-xs font-medium text-gray-700">
          {deal.estimatedValue ? `${deal.currency} ${parseFloat(deal.estimatedValue).toLocaleString()}` : '$0.00'}
        </span>
      </div>
      {deal.contact.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {deal.contact.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span title="WhatsApp">💬 {deal.contact._count.whatsappMessages}</span>
        <span title="Actividades">✓ {deal.contact._count.activities}</span>
        <span title="Citas">📅 {deal.contact._count.appointments}</span>
      </div>
      {compact && (
        <label className="block mt-3 text-xs font-medium text-gray-500">
          Cambiar etapa
          <select
            value={deal.stage}
            onChange={(e) => moveToStage(deal.id, e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gtl-orange"
          >
            {STAGES.map((stage) => (
              <option key={stage.key} value={stage.key}>{stage.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes Potenciales</h1>
          <p className="text-sm text-gray-500 mt-1">{deals.length} oportunidades en {activeFunnelLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Link
            href="/crm"
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
          >
            Ver Contactos
          </Link>
          <Link
            href="/crm/contacts/new"
            className="px-3 sm:px-4 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 text-center"
          >
            + Nuevo Contacto
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-3 sm:flex-wrap">
        {FUNNELS.map((funnel) => (
          <button
            key={funnel.key}
            type="button"
            onClick={() => setActiveFunnel(funnel.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeFunnel === funnel.key
                ? 'bg-gtl-orange text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {funnel.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando pipeline...</div>
      ) : (
        <>
        <div className="md:hidden space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Etapa del embudo
            <select
              value={activeStage}
              onChange={(e) => setActiveStage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-700 focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            >
              {STAGES.map((stage) => {
                const count = byStage(stage.key).length
                return <option key={stage.key} value={stage.key}>{stage.label} ({count})</option>
              })}
            </select>
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-2">
            {byStage(activeStage).map((deal) => renderDealCard(deal, true))}
            {byStage(activeStage).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No hay clientes en esta etapa</p>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = byStage(stage.key)
              const total = totalByStage(stage.key)
              return (
                <div
                  key={stage.key}
                  className="w-72 flex flex-col"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, stage.key)}
                >
                  <div className={`bg-white rounded-t-lg border-t-4 ${stage.color} border-x border-gray-200 px-3 py-3 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-sm">{stage.label}</span>
                      <span className="text-xs font-semibold text-gray-700">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stageDeals.length} cliente{stageDeals.length !== 1 ? 's' : ''} potencial{stageDeals.length !== 1 ? 'es' : ''}</p>
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-b-lg border-x border-b border-gray-200 p-2 space-y-2 min-h-[520px]">
                    {stageDeals.map((deal) => renderDealCard(deal))}
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-gray-300 text-center pt-8">Arrastra aquí</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
