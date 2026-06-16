'use client'

import { useState, useEffect } from 'react'

interface CatalogEntry {
  key: string
  label: string
  value: number
  category: string
}

interface CatalogData {
  localCharges: CatalogEntry[]
  agente: CatalogEntry[]
  bodegaje: CatalogEntry[]
  permisos: CatalogEntry[]
  transport: CatalogEntry[]
}

function CatalogSection({
  title,
  entries,
  savedKeys,
  onSave,
}: {
  title: string
  entries: CatalogEntry[]
  savedKeys: Set<string>
  onSave: (key: string, value: number) => Promise<void>
}) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const init: Record<string, string> = {}
    entries.forEach(e => { init[e.key] = String(e.value) })
    setLocalValues(init)
  }, [entries])

  async function handleSave(key: string) {
    const val = parseFloat(localValues[key] ?? '0') || 0
    await onSave(key, val)
  }

  if (entries.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map(entry => (
          <div key={entry.key} className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1 text-sm text-gray-700">{entry.label}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={localValues[entry.key] ?? ''}
                onChange={e => setLocalValues(prev => ({ ...prev, [entry.key]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(entry.key) }}
                className="w-32 pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d2d6b] text-right font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSave(entry.key)}
              className="px-3 py-1.5 text-xs font-medium bg-[#0d2d6b] text-white rounded-lg hover:bg-[#0a2456] transition-colors"
            >
              Guardar
            </button>
            {savedKeys.has(entry.key) && (
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {!savedKeys.has(entry.key) && (
              <span className="w-4 h-4 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const [data, setData] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('No se pudo cargar el catálogo.'); setLoading(false) })
  }, [])

  async function handleSave(key: string, value: number) {
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error('Failed')
      setSavedKeys(prev => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      setTimeout(() => {
        setSavedKeys(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }, 2000)
    } catch {
      // silently ignore — user can retry
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400 text-sm">Cargando catálogo...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Servicios</h1>
        <p className="text-gray-500 text-sm mt-1">
          Precios base para cargos B2 y B3 — se aplican automáticamente en nuevas cotizaciones
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          <CatalogSection
            title="Bloque 2 — Gastos Locales GTL"
            entries={data.localCharges}
            savedKeys={savedKeys}
            onSave={handleSave}
          />
          <CatalogSection
            title="Bloque 3 — Agente de Aduana"
            entries={data.agente}
            savedKeys={savedKeys}
            onSave={handleSave}
          />
          <CatalogSection
            title="Bloque 3 — Bodegaje"
            entries={data.bodegaje}
            savedKeys={savedKeys}
            onSave={handleSave}
          />
          <CatalogSection
            title="Bloque 3 — Permisos de Importación"
            entries={data.permisos}
            savedKeys={savedKeys}
            onSave={handleSave}
          />
          <CatalogSection
            title="Bloque 3 — Transporte Interno"
            entries={data.transport}
            savedKeys={savedKeys}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  )
}
