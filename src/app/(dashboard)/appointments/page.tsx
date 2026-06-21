'use client'

import { useEffect, useState } from 'react'

interface Appointment {
  id: string; title: string; description: string | null
  startAt: string; endAt: string; remoteJid: string | null
  googleEventId: string | null; notified: boolean
  contact: { name: string; phone: string | null } | null
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/appointments').then(r => r.json()).then(d => { setAppointments(d); setLoading(false) }) }, [])
  const upcoming = appointments.filter(a => new Date(a.startAt) >= new Date())
  const past = appointments.filter(a => new Date(a.startAt) < new Date())
  const fmt = (dt: string) => new Date(dt).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Citas</h1>
      <p className="text-gray-500 text-sm mb-6">Agenda de citas con clientes</p>
      {loading ? <div className="text-center py-12 text-gray-400">Cargando...</div> : (<>
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximas ({upcoming.length})</h2>
          {upcoming.length === 0 ? <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">No hay citas próximas</div>
            : <div className="space-y-3">{upcoming.map(apt => <Card key={apt.id} apt={apt} fmt={fmt} upcoming />)}</div>}
        </section>
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pasadas ({past.length})</h2>
          {past.length === 0 ? <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">No hay citas anteriores</div>
            : <div className="space-y-3">{past.slice(0, 20).map(apt => <Card key={apt.id} apt={apt} fmt={fmt} />)}</div>}
        </section>
      </>)}
    </div>
  )
}

function Card({ apt, fmt, upcoming }: { apt: Appointment; fmt: (s: string) => string; upcoming?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${upcoming ? 'border-blue-200' : 'border-gray-100 opacity-70'}`}>
      <div className={`w-1 self-stretch rounded-full ${upcoming ? 'bg-blue-500' : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{apt.title}</p>
            {apt.contact && <p className="text-sm text-gray-500">{apt.contact.name}{apt.contact.phone ? ` · ${apt.contact.phone}` : ''}</p>}
            {apt.description && <p className="text-sm text-gray-600 mt-1">{apt.description}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-gray-700">{fmt(apt.startAt)}</p>
            <p className="text-xs text-gray-400">hasta {new Date(apt.endAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {apt.googleEventId && <span className="text-green-600">✓ Guardado en Google Calendar</span>}
          {!apt.googleEventId && upcoming && <span className="text-amber-600">No está en Google Calendar</span>}
          {apt.notified && <span className="text-blue-600">✓ Cliente notificado</span>}
          {!apt.notified && upcoming && <span className="text-amber-600">Cliente no notificado</span>}
        </div>
      </div>
    </div>
  )
}
