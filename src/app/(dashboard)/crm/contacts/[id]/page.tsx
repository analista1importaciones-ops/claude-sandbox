'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const SOURCE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta', REFERIDO: 'Referido', WEB: 'Web',
  LLAMADA: 'Llamada', FERIA: 'Feria', OTRO: 'Otro',
}
const SERVICE_LABELS: Record<string, string> = {
  CURSOS: 'Cursos', CARGA: 'Carga', ASESORIAS: 'Asesorías',
  INSPECCIONES: 'Inspecciones', BUSQUEDA_PROVEEDORES: 'Búsqueda de proveedores',
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
  TAREA: 'Tarea pendiente',
}

function getDueStatus(dueAt: string | null) {
  if (!dueAt) return { label: 'Sin fecha límite', className: 'bg-gray-100 text-gray-600' }
  const due = new Date(dueAt)
  const now = new Date()
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  if (due < now) return { label: 'Vencida', className: 'bg-red-50 text-red-700 border border-red-200' }
  if (due <= endOfToday) return { label: 'Para hoy', className: 'bg-orange-50 text-orange-700 border border-orange-200' }
  return { label: 'Programada', className: 'bg-blue-50 text-blue-700 border border-blue-200' }
}

interface Activity {
  id: string
  type: string
  text: string
  dueAt: string | null
  completedAt: string | null
  createdAt: string
  createdBy: { name: string }
}

interface Deal {
  id: string
  stage: string
  funnelId: string | null
  funnelStageId: string | null
  estimatedValue: string | null
  currency: string
  estimatedCloseAt: string | null
  notes: string | null
  funnel: { id: string; name: string } | null
  funnelStage: { id: string; name: string; order: number; color: string } | null
  quotation: { id: string; number: string; grandTotal: string } | null
}

interface Funnel {
  id: string
  name: string
  stages: { id: string; name: string; order: number; color: string }[]
}

interface Appointment {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  googleEventId: string | null
  notified: boolean
}

interface ServiceInvoice {
  id: string
  number: string
  serviceTag: string | null
  status: string
  total: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  tags: string[]
  source: string
  serviceLabel: string
  createdAt: string
  assignedTo: { id: string; name: string } | null
  deals: Deal[]
  activities: Activity[]
  appointments: Appointment[]
  serviceInvoices: ServiceInvoice[]
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [activityText, setActivityText] = useState('')
  const [activityType, setActivityType] = useState('NOTA')
  const [activityDueAt, setActivityDueAt] = useState('')
  const [addingActivity, setAddingActivity] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [dealFunnelId, setDealFunnelId] = useState('')
  const [dealFunnelStageId, setDealFunnelStageId] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [tab, setTab] = useState<'actividad' | 'whatsapp'>('actividad')
  const [waMessages, setWaMessages] = useState<{id:string;remoteJid:string;fromMe:boolean;content:string;timestamp:string}[]>([])
  const [waReply, setWaReply] = useState('')
  const [waSending, setWaSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const res = await fetch(`/api/crm/contacts/${id}`)
    if (res.ok) setContact(await res.json())
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch('/api/crm/funnels')
      .then(res => res.ok ? res.json() : [])
      .then((data: Funnel[]) => {
        setFunnels(data)
        const first = data.find(funnel => funnel.name === 'CARGAS') ?? data[0]
        setDealFunnelId(first?.id ?? '')
        setDealFunnelStageId(first?.stages[0]?.id ?? '')
      })
  }, [])

  const selectedDealFunnel = funnels.find(funnel => funnel.id === dealFunnelId)

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!activityText.trim()) return
    setAddingActivity(true)
    await fetch(`/api/crm/contacts/${id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activityType,
        text: activityText,
        dueAt: activityType === 'TAREA' && activityDueAt ? new Date(activityDueAt).toISOString() : null,
      }),
    })
    setActivityText('')
    setActivityDueAt('')
    setAddingActivity(false)
    load()
  }

  async function toggleTask(activityId: string, completed: boolean) {
    await fetch(`/api/crm/contacts/${id}/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
    load()
  }

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: id, funnelStageId: dealFunnelStageId, estimatedValue: dealValue || null }),
    })
    setShowDealForm(false)
    setDealValue('')
    load()
  }

  async function loadWA(phone: string) {
    const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`
    const res = await fetch(`/api/whatsapp/messages?jid=${encodeURIComponent(jid)}`)
    if (res.ok) { setWaMessages(await res.json()); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }
  }

  useEffect(() => {
    if (tab === 'whatsapp' && contact?.phone) {
      loadWA(contact.phone)
      const iv = setInterval(() => loadWA(contact.phone!), 5000)
      return () => clearInterval(iv)
    }
  }, [tab, contact?.phone]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendWA() {
    if (!waReply.trim() || !contact?.phone) return
    setWaSending(true)
    await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: contact.phone, body: waReply, contactId: id }) })
    setWaReply(''); setWaSending(false); loadWA(contact.phone)
  }

  async function moveDeal(dealId: string, funnelStageId: string) {
    await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnelStageId }),
    })
    load()
  }

  if (!contact) return <div className="p-6 text-gray-400">Cargando...</div>

  const pendingTasks = contact.activities.filter(a => a.type === 'TAREA' && !a.completedAt)
  const completedTasks = contact.activities.filter(a => a.type === 'TAREA' && a.completedAt)
  const overdueTasks = pendingTasks.filter(a => a.dueAt && new Date(a.dueAt) < new Date())

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
          {contact.tags?.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 block mb-1">Etiquetas</span>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Embudo</label>
                  <select
                    value={dealFunnelId}
                    onChange={(e) => {
                      const funnel = funnels.find(item => item.id === e.target.value)
                      setDealFunnelId(e.target.value)
                      setDealFunnelStageId(funnel?.stages[0]?.id ?? '')
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
                  >
                    {funnels.map(funnel => (
                      <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Etapa</label>
                  <select
                    value={dealFunnelStageId}
                    onChange={(e) => setDealFunnelStageId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
                  >
                    {selectedDealFunnel?.stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
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
                <span className="font-medium text-gray-800">{deal.funnelStage?.name ?? STAGE_LABELS[deal.stage]}</span>
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
              {deal.funnel && (
                <div className="text-xs text-gray-500 mb-2">
                  Embudo: <span className="font-medium">{deal.funnel.name}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(funnels.find(funnel => funnel.id === deal.funnelId)?.stages ?? []).map(stage => (
                  stage.id !== deal.funnelStageId && (
                    <button
                      key={stage.id}
                      onClick={() => moveDeal(deal.id, stage.id)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-md text-gray-600 hover:border-gtl-orange hover:text-gtl-orange"
                    >
                      → {stage.name}
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Facturas de servicio ({contact.serviceInvoices.length})</h2>
          <Link href={`/invoices/new`} className="text-sm text-blue-600 hover:text-blue-800">Nueva factura</Link>
        </div>
        {contact.serviceInvoices.length === 0 ? (
          <p className="text-sm text-gray-400">No hay facturas de servicio registradas para este cliente.</p>
        ) : (
          <div className="space-y-2">
            {contact.serviceInvoices.map(invoice => (
              <div key={invoice.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/invoices/${invoice.id}/edit`} className="text-sm font-medium text-gtl-navy hover:underline">{invoice.number}</Link>
                  <p className="text-xs text-gray-500">{invoice.serviceTag ?? 'Servicios GTL'} · {invoice.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${Number(invoice.total).toFixed(2)}</p>
                  <a href={`/api/service-invoices/${invoice.id}/pdf`} target="_blank" className="text-xs text-blue-600 hover:underline">PDF</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Citas ({contact.appointments.length})</h2>
          <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800">Ver agenda</Link>
        </div>
        {contact.appointments.length === 0 ? (
          <p className="text-sm text-gray-400">No hay citas registradas para este cliente.</p>
        ) : (
          <div className="space-y-2">
            {contact.appointments.slice(0, 5).map(apt => {
              const upcoming = new Date(apt.startAt) >= new Date()
              return (
                <div key={apt.id} className={`rounded-lg border px-3 py-2 ${upcoming ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{apt.title}</p>
                      {apt.description && <p className="text-xs text-gray-500 mt-0.5">{apt.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1 text-xs">
                        {apt.googleEventId && <span className="text-green-600">Google Calendar</span>}
                        {apt.notified && <span className="text-blue-600">Cliente notificado</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0">
                      <p>{new Date(apt.startAt).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p>hasta {new Date(apt.endAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          <button onClick={() => setTab('actividad')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'actividad' ? 'border-gtl-orange text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Actividad</button>
          <button onClick={() => setTab('whatsapp')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'whatsapp' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>💬 WhatsApp</button>
        </div>

        {tab === 'actividad' && <div className="space-y-4">
        <div className={`rounded-xl border shadow-sm p-4 ${overdueTasks.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold text-gray-800">Tareas del cliente</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {pendingTasks.length} pendiente{pendingTasks.length === 1 ? '' : 's'} · {completedTasks.length} completada{completedTasks.length === 1 ? '' : 's'}
              </p>
            </div>
            {overdueTasks.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                {overdueTasks.length} vencida{overdueTasks.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {pendingTasks.length === 0 ? (
            <p className="text-sm text-gray-400">No hay tareas pendientes para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map(task => {
                const due = getDueStatus(task.dueAt)
                return (
                  <div key={task.id} className="rounded-lg bg-white border border-gray-100 px-3 py-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-800">{task.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${due.className}`}>{due.label}</span>
                        {task.dueAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.dueAt).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id, true)}
                      className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100"
                    >
                      Completar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

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
            {activityType === 'TAREA' && (
              <input
                type="datetime-local"
                value={activityDueAt}
                onChange={(e) => setActivityDueAt(e.target.value)}
                className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
                aria-label="Fecha límite de la tarea"
              />
            )}
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
            <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-4 ${a.type === 'TAREA' && !a.completedAt ? 'border-orange-100' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{ACTIVITY_LABELS[a.type]}</span>
                  {a.type === 'TAREA' && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.completedAt ? 'bg-green-50 text-green-700 border border-green-200' : getDueStatus(a.dueAt).className}`}>
                      {a.completedAt ? 'Completada' : getDueStatus(a.dueAt).label}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleString('es-GT')} · {a.createdBy.name}
                </span>
              </div>
              <p className="text-sm text-gray-600">{a.text}</p>
              {a.type === 'TAREA' && (
                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="text-xs text-gray-500">
                    {a.dueAt ? `Vence: ${new Date(a.dueAt).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Sin fecha límite'}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTask(a.id, !a.completedAt)}
                    className="text-xs text-gtl-navy hover:underline"
                  >
                    {a.completedAt ? 'Reabrir tarea' : 'Marcar como completada'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {contact.activities.length === 0 && (
            <p className="text-sm text-gray-400">Sin actividades registradas.</p>
          )}
        </div>
        </div>}

        {tab === 'whatsapp' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {!contact.phone
              ? <p className="p-6 text-sm text-gray-400">Este contacto no tiene número de teléfono.</p>
              : <>
                <div className="h-80 overflow-y-auto p-4 space-y-2 bg-gray-50">
                  {waMessages.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No hay mensajes de WhatsApp con este contacto.</p>}
                  {waMessages.map(m => (
                    <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.fromMe ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        {m.content}
                        <div className={`text-xs mt-1 ${m.fromMe ? 'text-green-100' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-gray-100 px-4 py-3 flex gap-3">
                  <input type="text" value={waReply} onChange={e => setWaReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendWA()} placeholder={`Enviar mensaje a ${contact.name}...`} className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <button onClick={sendWA} disabled={waSending || !waReply.trim()} className="px-4 py-2 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 disabled:opacity-50">Enviar</button>
                </div>
              </>}
          </div>
        )}
      </div>
    </div>
  )
}
