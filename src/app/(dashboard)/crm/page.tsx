'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const SOURCE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta',
  REFERIDO: 'Referido',
  WEB: 'Web',
  LLAMADA: 'Llamada',
  FERIA: 'Feria',
  OTRO: 'Otro',
}

const SERVICE_LABELS: Record<string, string> = {
  COURIER: 'Courier',
  NACIONALIZACION: 'Nacionalización',
  TRANSPORTE_PESADO: 'Transporte Pesado',
  SEGURO_CARGA: 'Seguro de Carga',
  OTRO: 'Otro',
}

const SERVICE_COLORS: Record<string, string> = {
  COURIER: 'bg-blue-100 text-blue-800',
  NACIONALIZACION: 'bg-purple-100 text-purple-800',
  TRANSPORTE_PESADO: 'bg-orange-100 text-orange-800',
  SEGURO_CARGA: 'bg-green-100 text-green-800',
  OTRO: 'bg-gray-100 text-gray-600',
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
  _count: { deals: number; activities: number }
}

export default function CrmContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (serviceFilter) params.set('serviceLabel', serviceFilter)
    const res = await fetch(`/api/crm/contacts?${params}`)
    const data = await res.json()
    setContacts(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [search, serviceFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportMsg(null)
    const text = await file.text()
    const res = await fetch('/api/crm/contacts/import', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text })
    const data = await res.json()
    setImporting(false); e.target.value = ''
    if (res.ok) { setImportMsg(`✓ ${data.created} contactos importados`); load() }
    else setImportMsg(`Error: ${data.error}`)
  } // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM — Contactos</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} contactos</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/crm/pipeline"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver Pipeline
          </Link>
          <label className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? 'Importando...' : '↑ Importar CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <Link
            href="/crm/contacts/new"
            className="px-4 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            + Nuevo Contacto
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, empresa, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
        />
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
        >
          <option value="">Todos los servicios</option>
          {Object.entries(SERVICE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No hay contactos.{' '}
            <Link href="/crm/contacts/new" className="text-gtl-orange underline">
              Crear el primero
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Servicio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Origen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asignado a</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Deals / Act.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="font-medium text-gray-900 hover:text-gtl-orange"
                    >
                      {c.name}
                    </Link>
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                    {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.company || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SERVICE_COLORS[c.serviceLabel]}`}>
                      {SERVICE_LABELS[c.serviceLabel]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{SOURCE_LABELS[c.source]}</td>
                  <td className="px-4 py-3 text-gray-600">{c.assignedTo?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c._count.deals} / {c._count.activities}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('es-GT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
