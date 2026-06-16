'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PortCombobox from '@/components/PortCombobox'
import DuplicateRateModal from '@/components/DuplicateRateModal'
import { SURCHARGE_FIELDS } from '@/lib/rateStatus'

type Carrier = { id: string; name: string; type: string }
type Mode = 'LCL' | 'FCL20' | 'FCL40' | 'FCL40HC'
const modeLabels: Record<Mode, string> = { LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ' }

type DuplicateInfo = {
  existingRateId: string
  existingValidUntil: string
  carrier: string
  route: string
  mode: string
}

export default function NewRatePage() {
  const router = useRouter()
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [loading, setLoading] = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null)
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null)
  const [showNewCarrier, setShowNewCarrier] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [mode, setMode] = useState<Mode>('LCL')
  const [originPort, setOriginPort] = useState('')
  const [destinationPort, setDestinationPort] = useState('')
  const [surcharges, setSurcharges] = useState<Record<string, string>>({})
  const [freightRate, setFreightRate] = useState('')

  useEffect(() => {
    fetch('/api/carriers').then(r => r.json()).then(setCarriers)
  }, [])

  const computeTotal = useCallback(() => {
    const freight = parseFloat(freightRate) || 0
    const surchargeTotal = Object.values(surcharges).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
    return freight + surchargeTotal
  }, [freightRate, surcharges])

  async function submitForm(data: Record<string, unknown>, checkDuplicate: boolean) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, checkDuplicate }),
      })

      if (res.status === 409) {
        const dup = await res.json()
        setDuplicate(dup)
        setPendingData(data)
        setLoading(false)
        return
      }

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Error al guardar la tarifa')
        setLoading(false)
        return
      }

      const newRate = await res.json()
      router.push(`/rates/${newRate.id}`)
    } catch {
      setError('Error de conexión. Intente nuevamente.')
      setLoading(false)
    }
  }

  async function handleConfirmReplace() {
    if (!pendingData || !duplicate) return
    setLoading(true)
    const res = await fetch('/api/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pendingData, checkDuplicate: false }),
    })
    if (!res.ok) { setError('Error al guardar'); setLoading(false); return }
    const newRate = await res.json()
    await fetch(`/api/rates/${duplicate.existingRateId}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRateId: newRate.id }),
    })
    router.push(`/rates/${newRate.id}`)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined

    // Build surcharge payload — only non-zero
    const surchargeData: Record<string, unknown> = {}
    for (const f of SURCHARGE_FIELDS) {
      const val = get(f.key)
      if (val && parseFloat(val) !== 0) surchargeData[f.key] = val
    }

    let carrierId = get('carrierId')

    if (showNewCarrier) {
      const ncRes = await fetch('/api/carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: get('newCarrierName'), type: get('newCarrierType') ?? 'AGENTE', contactEmail: get('newCarrierEmail'), contactName: get('newCarrierContact'), contactPhone: get('newCarrierPhone') }),
      })
      const nc = await ncRes.json()
      carrierId = nc.id
    }

    if (!carrierId) { setError('Seleccione un agente/naviera'); return }

    const data = {
      carrierId,
      reference: get('reference'),
      receivedAt: get('receivedAt') ?? new Date().toISOString().split('T')[0],
      sourceFile: get('sourceFile'),
      notes: get('sheetNotes'),
      rate: {
        originCountry: get('originCountry'),
        originPort,
        destinationPort,
        mode,
        currency: get('currency') ?? 'USD',
        validFrom: get('validFrom'),
        validUntil: get('validUntil'),
        freightRate: get('freightRate'),
        freightUnit: mode === 'LCL' ? 'CBM' : 'CONT',
        ...surchargeData,
        otherChargesDesc: get('otherChargesDesc'),
        transitDaysMin: get('transitDaysMin'),
        transitDaysMax: get('transitDaysMax'),
        frequency: get('frequency'),
        commodity: get('commodity'),
        notes: get('rateNotes'),
      },
    }

    await submitForm(data, true)
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gtl-navy focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const sectionClass = 'bg-white rounded-xl border border-gray-200 p-6 space-y-4'
  const sectionTitleClass = 'text-base font-semibold text-gtl-navy border-b border-gray-100 pb-2'

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {duplicate && (
        <DuplicateRateModal
          carrier={duplicate.carrier}
          route={duplicate.route}
          mode={duplicate.mode}
          existingValidUntil={duplicate.existingValidUntil}
          onCancel={() => { setDuplicate(null); setPendingData(null); setLoading(false) }}
          onConfirm={handleConfirmReplace}
          loading={loading}
        />
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/rates" className="text-gray-400 hover:text-gray-600 text-sm">← Tarifas</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Nueva Tarifa</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Section 1: Proveedor */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>1. Proveedor</h2>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass.replace('mb-1','')}>Agente / Naviera <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setShowNewCarrier(v => !v)} className="text-xs text-gtl-navy hover:underline">
                  {showNewCarrier ? '← Seleccionar existente' : '+ Crear nuevo'}
                </button>
              </div>
              {showNewCarrier ? (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>Nombre <span className="text-red-500">*</span></label><input name="newCarrierName" required className={inputClass} placeholder="MSC Ecuador" /></div>
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select name="newCarrierType" className={inputClass}>
                        <option value="NAVIERA">Naviera</option>
                        <option value="AGENTE">Agente de Carga</option>
                        <option value="CONSOLIDADOR">Consolidador</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={labelClass}>Email</label><input name="newCarrierEmail" type="email" className={inputClass} placeholder="rates@naviera.com" /></div>
                    <div><label className={labelClass}>Contacto</label><input name="newCarrierContact" className={inputClass} placeholder="Nombre del ejecutivo" /></div>
                    <div><label className={labelClass}>Teléfono / WhatsApp</label><input name="newCarrierPhone" className={inputClass} placeholder="+593..." /></div>
                  </div>
                </div>
              ) : (
                <select name="carrierId" className={inputClass}>
                  <option value="">Seleccionar agente/naviera...</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Referencia del rate sheet</label><input name="reference" className={inputClass} placeholder="Rate Sheet Jun 2026 — MSC" /></div>
              <div><label className={labelClass}>Fecha de recepción</label><input name="receivedAt" type="date" defaultValue={today} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Nombre del PDF recibido (opcional)</label><input name="sourceFile" className={inputClass} placeholder="rate_sheet_jun2026_msc.pdf" /></div>
            <div><label className={labelClass}>Notas del rate sheet</label><textarea name="sheetNotes" rows={2} className={inputClass} placeholder="Observaciones generales sobre este rate sheet..." /></div>
          </div>

          {/* Section 2: Ruta */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>2. Ruta y Modalidad</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>País de origen <span className="text-red-500">*</span></label><input name="originCountry" required className={inputClass} placeholder="China, USA, India..." /></div>
              <div><label className={labelClass}>Moneda</label>
                <select name="currency" className={inputClass}>
                  <option value="USD">USD — Dólar americano</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PortCombobox name="originPort" value={originPort} onChange={setOriginPort} label="Puerto de origen *" required placeholder="NINGBO, SHANGHAI..." />
              <PortCombobox name="destinationPort" value={destinationPort} onChange={setDestinationPort} label="Puerto de destino *" required placeholder="GYE, MEC..." />
            </div>
            <div>
              <label className={labelClass}>Modalidad <span className="text-red-500">*</span></label>
              <div className="flex gap-3 flex-wrap">
                {(Object.entries(modeLabels) as [Mode, string][]).map(([k, v]) => (
                  <label key={k} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${mode === k ? 'border-gtl-navy bg-gtl-navy text-white' : 'border-gray-200 text-gray-700 hover:border-gtl-navy'}`}>
                    <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="sr-only" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Vigencia */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>3. Vigencia y Tránsito</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Válido desde <span className="text-red-500">*</span></label><input name="validFrom" type="date" required defaultValue={today} className={inputClass} /></div>
              <div><label className={labelClass}>Válido hasta <span className="text-red-500">*</span></label><input name="validUntil" type="date" required className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelClass}>Tránsito mín. (días)</label><input name="transitDaysMin" type="number" min="0" className={inputClass} placeholder="35" /></div>
              <div><label className={labelClass}>Tránsito máx. (días)</label><input name="transitDaysMax" type="number" min="0" className={inputClass} placeholder="40" /></div>
              <div><label className={labelClass}>Frecuencia</label><input name="frequency" className={inputClass} placeholder="Cada 7 días" /></div>
            </div>
          </div>

          {/* Section 4: Ocean Freight */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>4. Ocean Freight</h2>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className={labelClass}>Flete base <span className="text-red-500">*</span></label>
                <div className="flex">
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-600">USD $</span>
                  <input name="freightRate" type="number" step="0.01" min="0" required value={freightRate} onChange={e => setFreightRate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-gtl-navy focus:border-transparent" placeholder="0.00" />
                </div>
              </div>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 whitespace-nowrap">
                por {mode === 'LCL' ? 'CBM' : 'contenedor'}
              </div>
            </div>
          </div>

          {/* Section 5: Surcharges */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>5. Surcharges <span className="text-xs font-normal text-gray-400 ml-2">todos opcionales</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SURCHARGE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <div className="flex">
                    <span className="px-2 py-1.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-xs text-gray-500">$</span>
                    <input
                      name={f.key}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={surcharges[f.key] ?? ''}
                      onChange={e => setSurcharges(p => ({ ...p, [f.key]: e.target.value }))}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div><label className={labelClass}>Descripción de &quot;Otros&quot;</label><input name="otherChargesDesc" className={inputClass} placeholder="Ej: Recargo especial por temporada alta" /></div>
            <div className="mt-4 p-4 bg-gtl-navy/5 border border-gtl-navy/20 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-gtl-navy">TOTAL ALL-IN estimado</span>
              <span className="text-xl font-bold text-gtl-navy">${computeTotal().toFixed(2)} <span className="text-sm font-normal">/ {mode === 'LCL' ? 'CBM' : 'cont.'}</span></span>
            </div>
          </div>

          {/* Section 6: Observaciones */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>6. Observaciones</h2>
            <div><label className={labelClass}>Tipo de carga</label><input name="commodity" className={inputClass} placeholder="Carga general, estibable, No IMO" /></div>
            <div><label className={labelClass}>Notas adicionales</label><textarea name="rateNotes" rows={3} className={inputClass} placeholder="Condiciones especiales, restricciones, acuerdos particulares..." /></div>
          </div>

          <div className="flex gap-3 pb-6">
            <Link href="/rates" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</Link>
            <button type="submit" disabled={loading} className="flex-1 bg-gtl-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gtl-navy-dark transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Tarifa'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
