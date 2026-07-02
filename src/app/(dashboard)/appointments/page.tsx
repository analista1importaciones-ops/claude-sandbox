'use client'

import { useEffect, useState } from 'react'

interface Advisor { id: string; name: string; email: string }
interface Appointment {
  id: string; title: string; description: string | null
  startAt: string; endAt: string; remoteJid: string | null
  googleEventId: string | null; notified: boolean
  contact: { name: string; phone: string | null; assignedTo: { id: string; name: string } | null } | null
}

function localInputValue(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find(part => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function ecuadorInputToIso(value: string) {
  return new Date(`${value}:00-05:00`).toISOString()
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form, setForm] = useState({ title: '', description: '', startAt: '', endAt: '', assignedToId: '', notifyClient: true })
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [appointmentRes, userRes] = await Promise.all([fetch('/api/appointments'), fetch('/api/users')])
    if (appointmentRes.ok) setAppointments(await appointmentRes.json())
    if (userRes.ok) setAdvisors(await userRes.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment)
    setForm({
      title: appointment.title,
      description: appointment.description || '',
      startAt: localInputValue(appointment.startAt),
      endAt: localInputValue(appointment.endAt),
      assignedToId: appointment.contact?.assignedTo?.id || '',
      notifyClient: true,
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/appointments/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, startAt: ecuadorInputToIso(form.startAt), endAt: ecuadorInputToIso(form.endAt) }),
    })
    const data = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) { setNotice(data?.error || 'No se pudo actualizar la cita.'); return }
    setNotice(data.googleWarning ? `Cita guardada. Google: ${data.googleWarning}` : 'Cita y Google Calendar actualizados.')
    setEditing(null)
    load()
  }

  const remove = async (appointment: Appointment) => {
    if (!confirm(`¿Eliminar la cita "${appointment.title}"?`)) return
    const res = await fetch(`/api/appointments/${appointment.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (!res.ok) { setNotice(data?.error || 'No se pudo eliminar la cita.'); return }
    setNotice(data.googleWarning ? `Cita eliminada de GTL OS. Google: ${data.googleWarning}` : 'Cita eliminada también de Google Calendar.')
    load()
  }

  const upcoming = appointments.filter(a => new Date(a.startAt) >= new Date())
  const past = appointments.filter(a => new Date(a.startAt) < new Date())
  const fmt = (dt: string) => new Date(dt).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' })

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div><h1 className="text-2xl font-bold text-gray-900">Citas</h1><p className="text-gray-500 text-sm">Agenda, responsables y Google Calendar</p></div>
        <a href="/api/google/auth" className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700">Conectar Google Calendar</a>
      </div>
      {notice && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}
      {loading ? <div className="text-center py-12 text-gray-400">Cargando...</div> : <>
        <section className="mb-8"><h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Próximas ({upcoming.length})</h2>{upcoming.length === 0 ? <Empty text="No hay citas próximas" /> : <div className="space-y-3">{upcoming.map(apt => <Card key={apt.id} apt={apt} fmt={fmt} upcoming onEdit={openEdit} onDelete={remove} />)}</div>}</section>
        <section><h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pasadas ({past.length})</h2>{past.length === 0 ? <Empty text="No hay citas anteriores" /> : <div className="space-y-3">{past.slice(0, 20).map(apt => <Card key={apt.id} apt={apt} fmt={fmt} onEdit={openEdit} onDelete={remove} />)}</div>}</section>
      </>}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Editar cita</h2>
        <div className="mt-4 space-y-3">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Título" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Descripción" />
          <select value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm"><option value="">Sin asignar</option>{advisors.map(advisor => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}</select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" /><input type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.notifyClient} onChange={e => setForm({ ...form, notifyClient: e.target.checked })} /> Notificar cambio al cliente</label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600">Cancelar</button><button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>
      </div></div>}
    </div>
  )
}

function Empty({ text }: { text: string }) { return <div className="bg-white rounded-lg border p-6 text-center text-gray-400 text-sm">{text}</div> }
function Card({ apt, fmt, upcoming, onEdit, onDelete }: { apt: Appointment; fmt: (s: string) => string; upcoming?: boolean; onEdit: (apt: Appointment) => void; onDelete: (apt: Appointment) => void }) {
  return <div className={`bg-white rounded-lg border p-4 flex gap-4 ${upcoming ? 'border-blue-200' : 'border-gray-100 opacity-80'}`}><div className={`w-1 rounded-full ${upcoming ? 'bg-blue-500' : 'bg-gray-300'}`} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="font-semibold">{apt.title}</p>{apt.contact && <p className="text-sm text-gray-500">{apt.contact.name}{apt.contact.phone ? ` · ${apt.contact.phone}` : ''}</p>}<p className="mt-1 text-xs text-indigo-600">Asesor: {apt.contact?.assignedTo?.name || 'Sin asignar'}</p>{apt.description && <p className="mt-1 text-sm text-gray-600">{apt.description}</p>}</div><div className="sm:text-right"><p className="text-sm font-medium">{fmt(apt.startAt)}</p><p className="text-xs text-gray-400">hasta {new Date(apt.endAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })}</p></div></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs">{apt.googleEventId ? <span className="text-green-600">Google Calendar conectado</span> : <span className="text-amber-600">Pendiente en Google Calendar</span>}<button onClick={() => onEdit(apt)} className="text-blue-600">Editar</button><button onClick={() => onDelete(apt)} className="text-red-500">Eliminar</button></div></div></div>
}
