'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const SOURCE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta', REFERIDO: 'Referido', WEB: 'Web',
  LLAMADA: 'Llamada', FERIA: 'Feria', OTRO: 'Otro',
}
const SERVICE_LABELS: Record<string, string> = {
  COURIER: 'Courier', NACIONALIZACION: 'Nacionalización',
  TRANSPORTE_PESADO: 'Transporte Pesado', SEGURO_CARGA: 'Seguro de Carga', OTRO: 'Otro',
}
const STAGE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta', CONTACTADO: 'Contactado', COTIZADO: 'Cotizado',
  SEGUIMIENTO: 'Seguimiento', NEGOCIANDO: 'Negociando',
  CERRADO_GANADO: 'Cerrado/Ganado', PERDIDO: 'Perdido',
}
const ACTIVITY_LABELS: Record<string, string> = {
  LLAMADA: '📞 Llamada', WHATSAPP: '💬 WhatsApp',
  EMAIL: '✉️ Email', NOTA: '📝 Nota', REUNION: '🤝 Reunión',
}

interface Activity {
  id: string
  type: string
  text: string
  createdAt: string
  createdBy: { name: string }
}

interface Deal {
  id: string
  stage: string
  estimatedValue: string | null
  currency: string
  estimatedCloseAt: string | null
  notes: string | null
  quotation: { id: string; number: string; grandTotal: string } | null
}

interface Contact {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  source: string
  serviceLabel: string
  createdAt: string
  assignedTo: { id: string; name: string } | null
  deals: Deal[]
  activities: Activity[]
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [activityText, setActivityText] = useState('')
  const [activityType, setActivityType] = useState('NOTA')
  const [addingActivity, setAddingActivity] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealStage, setDealStage] = useState('PAUTA')
  const [dealValue, setDealValue] = useState('')

  async function load() {
    const res = await fetch(`/api/crm/contacts/${id}`)
    if (res.ok) setContact(await res.json())
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!activityText.trim()) return
    setAddingActivity(true)
    await fetch(`/api/crm/contacts/${id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activityType, text: activityText }),
    })
    setActivityText('')
    setAddingActivity(false)
    load()
  }

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: id, stage: dealStage, estimatedValue: dealValue || null }),
    })
    setShowDealForm(false)
    setDealValue('')
    setDealStage('PAUTA')
    load()
  }

  async function moveDeal(dealId: string, stage: string) {
    await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    load()
  }

  if (!contact) return <div className="p-6 text-gray-400">Cargando...</div>

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/crm" className="text-sm text-gray-500 hover:text-gray-700">
            ← Contactos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{contact.name}</h1>
          {contact.company && <p className="text-gray-500">{contact.company}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Información</h2>
          {contact.email && (
            <div>
              <span className="text-xs text-gray-400 block">Email</span>
              <span className="text-sm text-gray-700">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div>
              <span className="text-xs text-gray-400 block">Teléfono</span>
              <span className="text-sm text-gray-700">{contact.phone}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-400 block">Origen</span>
            <span className="text-sm text-gray-700">{SOURCE_LABELS[contact.source]}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Servicio</span>
            <span className="text-sm text-gray-700">{SERVICE_LABELS[contact.serviceLabel]}</span>
          </div>
          {contact.assignedTo && (
            <div>
              <span className="text-xs text-gray-400 block">Asignado a</span>
              <span className="text-sm text-gray-700">{contact.assignedTo.name}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-400 block">Creado</span>
            <span className="text-sm text-gray-700">
              {new Date(contact.createdAt).toLocaleDateString('es-GT')}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Oportunidades ({contact.deals.length})</h2>
            <button
              onClick={() => setShowDealForm(!showDealForm)}
              className="text-sm px-3 py-1.5 bg-gtl-orange text-white rounded-lg hover:bg-orange-600"
            >
              + Deal
            </button>
          </div>

          {showDealForm && (
            <form onSubmit={submitDeal} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Etapa</label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
                  >
                    {Object.entries(STAGE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Valor estimado (USD)</label>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-1.5 bg-gtl-orange text-white rounded-lg text-sm hover:bg-orange-600">
                  Crear
                </button>
                <button type="button" onClick={() => setShowDealForm(false)} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {contact.deals.map((deal) => (
            <div key={deal.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{STAGE_LABELS[deal.stage]}</span>
                {deal.estimatedValue && (
                  <span className="text-sm font-semibold text-gtl-orange">
                    {deal.currency} {parseFloat(deal.estimatedValue).toLocaleString()}
                  </span>
                )}
              </div>
              {deal.quotation && (
                <div className="text-xs text-gray-500 mb-2">
                  Cotización: <span className="font-medium">{deal.quotation.number}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  k !== deal.stage && (
                    <button
                      key={k}
                      onClick={() => moveDeal(deal.id, k)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-md text-gray-600 hover:border-gtl-orange hover:text-gtl-orange"
                    >
                      → {v}
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}

          {contact.deals.length === 0 && !showDealForm && (
            <p className="text-sm text-gray-400">No hay oportunidades registradas.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-gray-800">Actividad</h2>

        <form onSubmit={submitActivity} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            >
              {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <textarea
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              placeholder="Registrar actividad..."
              rows={1}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange resize-none"
            />
            <button
              type="submit"
              disabled={addingActivity || !activityText.trim()}
              className="px-4 py-2 bg-gtl-orange text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {contact.activities.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{ACTIVITY_LABELS[a.type]}</span>
                <span className="text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleString('es-GT')} · {a.createdBy.name}
                </span>
              </div>
              <p className="text-sm text-gray-600">{a.text}</p>
            </div>
          ))}
          {contact.activities.length === 0 && (
            <p className="text-sm text-gray-400">Sin actividades registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
