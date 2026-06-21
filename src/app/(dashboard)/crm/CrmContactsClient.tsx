'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const PAGE_SIZE = 50

const SOURCE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta',
  REFERIDO: 'Referido',
  WEB: 'Web',
  LLAMADA: 'Llamada',
  FERIA: 'Feria',
  OTRO: 'Otro',
}

const SERVICE_LABELS: Record<string, string> = {
  CURSOS: 'Cursos',
  CARGA: 'Carga',
  ASESORIAS: 'Asesorías',
  INSPECCIONES: 'Inspecciones',
  BUSQUEDA_PROVEEDORES: 'Búsqueda de proveedores',
  COURIER: 'Courier',
  NACIONALIZACION: 'Nacionalización',
  TRANSPORTE_PESADO: 'Transporte Pesado',
  SEGURO_CARGA: 'Seguro de Carga',
  OTRO: 'Otro',
}

const SERVICE_COLORS: Record<string, string> = {
  CURSOS: 'bg-indigo-100 text-indigo-800',
  CARGA: 'bg-emerald-100 text-emerald-800',
  ASESORIAS: 'bg-sky-100 text-sky-800',
  INSPECCIONES: 'bg-amber-100 text-amber-800',
  BUSQUEDA_PROVEEDORES: 'bg-pink-100 text-pink-800',
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
  tags: string[]
  source: string
  serviceLabel: string
  createdAt: string
  assignedTo: { id: string; name: string } | null
  _count: { deals: number; activities: number }
}

interface InitialData {
  contacts: Contact[]
  total: number
  totalPages: number
}

export default function CrmContactsClient({
  initialData,
  loadOnMount = false,
}: {
  initialData: InitialData
  loadOnMount?: boolean
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialData.contacts)
  const [loading, setLoading] = useState(loadOnMount)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialData.total)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const initialLoadStarted = useRef(false)

  async function load() {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (serviceFilter) params.set('serviceLabel', serviceFilter)
    try {
      const res = await fetch(`/api/crm/contacts?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el CRM')
      setContacts(Array.isArray(data.contacts) ? data.contacts : [])
      setTotal(Number(data.total || 0))
      setTotalPages(Number(data.totalPages || 1))
    } catch (err) {
      setContacts([])
      setError(err instanceof Error ? err.message : 'No se pudo cargar el CRM')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(1) }, [serviceFilter])

  useEffect(() => {
    const isInitialLoad = page === 1 && !debouncedSearch && !serviceFilter
    if (!loadOnMount && isInitialLoad) return
    if (loadOnMount && isInitialLoad && initialLoadStarted.current) return
    if (loadOnMount && isInitialLoad) initialLoadStarted.current = true
    load()
  }, [debouncedSearch, serviceFilter, page]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportMsg(null)
    const text = await file.text()
    const res = await fetch('/api/crm/contacts/import', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text })
    const data = await res.json()
    setImporting(false); e.target.value = ''
    if (res.ok) { setImportMsg(`✓ ${data.created} contactos importados`); setPage(1); load() }
    else setImportMsg(`Error: ${data.error}`)
  } // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM — Contactos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} contactos{total > 0 ? ` · mostrando ${from}-${to}` : ''}
          </p>
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
      {importMsg && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {importMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : loading ? (
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
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{tag}</span>
                        ))}
                        {c.tags.length > 3 && <span className="text-xs text-gray-400">+{c.tags.length - 3}</span>}
                      </div>
                    )}
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
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
