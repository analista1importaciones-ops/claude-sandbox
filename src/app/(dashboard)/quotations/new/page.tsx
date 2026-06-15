'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SURCHARGE_FIELDS } from '@/lib/rateStatus'

type LineItem = { label: string; amount: number }

interface RateData {
  id: string
  originPort: string
  destinationPort: string
  originCountry: string
  mode: string
  currency: string
  validUntil: string
  replacedById: string | null
  freightRate: number | null
  freightUnit: string | null
  transitDaysMin: number | null
  transitDaysMax: number | null
  frequency: string | null
  rateSheet: { carrier: { name: string } }
  baf?: number; caf?: number; isps?: number; thcOrigin?: number; thcDestination?: number
  docFee?: number; handling?: number; vgm?: number; customsOrigin?: number; manifest?: number
  pickUp?: number; overlength?: number; seal?: number; telexRelease?: number; ams?: number
  gri?: number; pss?: number; congestion?: number; cleaningFee?: number; portCharges?: number
  warehouse?: number; insurance?: number; otherCharges?: number; otherChargesDesc?: string | null
}

interface GtlConfig {
  key: string
  label: string
  value: number
}

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

const INCOTEMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'FCA', 'CPT', 'CIP']

function today() { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }

export default function NewQuotationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rateId = searchParams.get('rateId')

  const [rate, setRate] = useState<RateData | null>(null)
  const [rateStatus, setRateStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Route
  const [originPort, setOriginPort] = useState('')
  const [destinationPort, setDestinationPort] = useState('')
  const [originCountry, setOriginCountry] = useState('')
  const [destinationCountry, setDestinationCountry] = useState('Ecuador')
  const [mode, setMode] = useState('LCL')
  const [incoterm, setIncoterm] = useState('FOB')
  const [currency, setCurrency] = useState('USD')
  const [cbm, setCbm] = useState('')
  const [containers, setContainers] = useState('')
  const [grossWeightKg, setGrossWeightKg] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [issueDate, setIssueDate] = useState(today())
  const [validUntil, setValidUntil] = useState(daysFromNow(15))
  const [notes, setNotes] = useState('')

  // Intl charges (editable line items)
  const [intlCharges, setIntlCharges] = useState<LineItem[]>([])

  // Local GTL charges (pre-loaded from GtlCostConfig, editable)
  const [localCharges, setLocalCharges] = useState<LineItem[]>([])

  // Other charges
  const [otherCharges, setOtherCharges] = useState<LineItem[]>([
    { label: 'Transporte interno', amount: 0 },
  ])

  // Load GTL cost configs
  const loadGtlConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/gtl-costs')
      if (res.ok) {
        const configs: GtlConfig[] = await res.json()
        setLocalCharges(configs.map(c => ({ label: c.label, amount: c.value })))
      }
    } catch {
      // Use defaults if API not available
      setLocalCharges([
        { label: 'Servicio logístico GTL', amount: 225 },
        { label: 'Admisión', amount: 170 },
        { label: 'Transmisión', amount: 115 },
        { label: 'Loc / ISD', amount: 67 },
        { label: 'Agente de aduana', amount: 332.58 },
        { label: 'Bodega', amount: 150 },
      ])
    }
  }, [])

  // Load rate if rateId provided
  useEffect(() => {
    if (!rateId) { loadGtlConfigs(); return }
    setLoading(true)
    fetch(`/api/rates/${rateId}`)
      .then(r => r.json())
      .then((data: RateData) => {
        setRate(data)

        // Compute status client-side
        const now = new Date()
        const vu = new Date(data.validUntil)
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        if (data.replacedById) setRateStatus('REPLACED')
        else if (vu < now) setRateStatus('EXPIRED')
        else if (vu <= sevenDays) setRateStatus('EXPIRING_SOON')
        else setRateStatus('ACTIVE')

        // Pre-fill route fields
        setOriginPort(data.originPort)
        setDestinationPort(data.destinationPort)
        setOriginCountry(data.originCountry)
        setMode(data.mode)
        setCurrency(data.currency || 'USD')

        // Build intl charges from rate surcharges
        const lines: LineItem[] = []
        if (data.freightRate) lines.push({ label: 'Ocean Freight', amount: Number(data.freightRate) })
        for (const f of SURCHARGE_FIELDS) {
          const key = f.key as keyof RateData
          const val = Number(data[key] || 0)
          if (val > 0) {
            const label = f.key === 'otherCharges' && data.otherChargesDesc ? data.otherChargesDesc : f.label
            lines.push({ label, amount: val })
          }
        }
        setIntlCharges(lines)
      })
      .catch(() => setError('No se pudo cargar la tarifa.'))
      .finally(() => { setLoading(false); loadGtlConfigs() })
  }, [rateId, loadGtlConfigs])

  const isLCL = mode === 'LCL'

  const intlTotal = intlCharges.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const localTotal = localCharges.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const otherTotal = otherCharges.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const grandTotal = intlTotal + localTotal + otherTotal

  function updateLine(arr: LineItem[], setArr: (v: LineItem[]) => void, i: number, field: 'label' | 'amount', val: string) {
    const next = [...arr]
    next[i] = { ...next[i], [field]: field === 'amount' ? parseFloat(val) || 0 : val }
    setArr(next)
  }

  function addLine(arr: LineItem[], setArr: (v: LineItem[]) => void) {
    setArr([...arr, { label: '', amount: 0 }])
  }

  function removeLine(arr: LineItem[], setArr: (v: LineItem[]) => void, i: number) {
    setArr(arr.filter((_, idx) => idx !== i))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) { setError('El nombre del cliente es obligatorio.'); return }
    if (!originPort.trim() || !destinationPort.trim()) { setError('Origen y destino son obligatorios.'); return }
    if (rateStatus === 'EXPIRED') { setError('No se puede crear una cotización con una tarifa vencida.'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateId: rateId || undefined,
          customerName, customerEmail: customerEmail || undefined, customerPhone: customerPhone || undefined,
          originPort, destinationPort, originCountry, destinationCountry,
          mode, incoterm, currency,
          cbm: isLCL ? cbm || undefined : undefined,
          containers: !isLCL ? containers || undefined : undefined,
          grossWeightKg: grossWeightKg || undefined,
          productDesc: productDesc || undefined,
          issueDate, validUntil,
          transitDaysMin: rate?.transitDaysMin,
          transitDaysMax: rate?.transitDaysMax,
          frequency: rate?.frequency,
          intlCharges: intlCharges.filter(r => r.label && r.amount > 0),
          localCharges: localCharges.filter(r => r.label && r.amount > 0),
          otherCharges: otherCharges.filter(r => r.label && r.amount > 0),
          intlTotal, localTotal, otherTotal, grandTotal,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const q = await res.json()
      router.push(`/quotations/${q.id}`)
    } catch {
      setError('Ocurrió un error al guardar la cotización.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400 text-sm">Cargando tarifa...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/quotations" className="hover:text-gray-600">Cotizaciones</Link>
        <span>/</span>
        <span className="text-gray-600">Nueva cotización</span>
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Cotización</h1>
          {rate && <p className="text-sm text-gray-500 mt-0.5">Pre-cargada desde tarifa · {rate.rateSheet.carrier.name} · {rate.originPort} → {rate.destinationPort}</p>}
        </div>
      </div>

      {/* Rate status warnings */}
      {rateStatus === 'EXPIRED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-700">
          ✕ La tarifa seleccionada está <strong>vencida</strong>. No se puede usar en nuevas cotizaciones. <Link href="/rates" className="underline font-medium">Seleccione otra tarifa</Link>.
        </div>
      )}
      {rateStatus === 'EXPIRING_SOON' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm text-orange-700">
          ⚠ Esta tarifa vence en menos de 7 días. Confirme con el agente antes de enviar la cotización al cliente.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Section 1: Client */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Datos del cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente *</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} required
                placeholder="Empresa o persona"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email (opcional)</label>
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} type="email"
                placeholder="cliente@empresa.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono (opcional)</label>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+593 99 000 0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
          </div>
        </div>

        {/* Section 2: Route */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Datos del embarque</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puerto origen *</label>
              <input value={originPort} onChange={e => setOriginPort(e.target.value.toUpperCase())} required
                placeholder="NINGBO"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puerto destino *</label>
              <input value={destinationPort} onChange={e => setDestinationPort(e.target.value.toUpperCase())} required
                placeholder="GYE"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País origen</label>
              <input value={originCountry} onChange={e => setOriginCountry(e.target.value)}
                placeholder="China"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País destino</label>
              <input value={destinationCountry} onChange={e => setDestinationCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modalidad</label>
              <select value={mode} onChange={e => setMode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy">
                {Object.entries(modeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Incoterm</label>
              <select value={incoterm} onChange={e => setIncoterm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy">
                {INCOTEMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{isLCL ? 'CBM (m³)' : 'Contenedores'}</label>
              {isLCL
                ? <input type="number" step="0.001" min="0" value={cbm} onChange={e => setCbm(e.target.value)} placeholder="0.000"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
                : <input type="number" min="1" value={containers} onChange={e => setContainers(e.target.value)} placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Peso bruto (kg)</label>
              <input type="number" step="0.01" min="0" value={grossWeightKg} onChange={e => setGrossWeightKg(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de carga (opcional)</label>
              <input value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="Ej: Maquinaria industrial, ropa, electrodomésticos..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy">
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Fechas de la cotización</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de emisión</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Válida hasta</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
          </div>
        </div>

        {/* Section 4: Bloque 1 — Transporte Internacional */}
        <ChargesBlock
          title="Bloque 1 — Transporte Internacional"
          subtitle={`por ${isLCL ? 'CBM' : 'contenedor'}`}
          items={intlCharges}
          setItems={setIntlCharges}
          total={intlTotal}
          currency={currency}
          onUpdate={(i, f, v) => updateLine(intlCharges, setIntlCharges, i, f, v)}
          onAdd={() => addLine(intlCharges, setIntlCharges)}
          onRemove={i => removeLine(intlCharges, setIntlCharges, i)}
        />

        {/* Section 5: Bloque 2 — Gastos Locales GTL */}
        <ChargesBlock
          title="Bloque 2 — Gastos Locales GTL"
          subtitle="fijos por operación"
          items={localCharges}
          setItems={setLocalCharges}
          total={localTotal}
          currency={currency}
          accent="orange"
          onUpdate={(i, f, v) => updateLine(localCharges, setLocalCharges, i, f, v)}
          onAdd={() => addLine(localCharges, setLocalCharges)}
          onRemove={i => removeLine(localCharges, setLocalCharges, i)}
        />

        {/* Section 6: Bloque 3 — Otros Costos */}
        <ChargesBlock
          title="Bloque 3 — Otros Costos"
          subtitle="transporte, seguro, etc."
          items={otherCharges}
          setItems={setOtherCharges}
          total={otherTotal}
          currency={currency}
          accent="gray"
          onUpdate={(i, f, v) => updateLine(otherCharges, setOtherCharges, i, f, v)}
          onAdd={() => addLine(otherCharges, setOtherCharges)}
          onRemove={i => removeLine(otherCharges, setOtherCharges, i)}
        />

        {/* Grand Total */}
        <div className="bg-gtl-navy rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium">TOTAL GENERAL</div>
              <div className="text-blue-300 text-xs mt-0.5">Transporte + Gastos locales + Otros</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gtl-orange font-mono">${grandTotal.toFixed(2)}</div>
              <div className="text-blue-300 text-xs mt-0.5">{currency}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Observaciones (opcional)</h2>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Condiciones especiales, aclaraciones para el cliente..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy resize-none" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="flex items-center justify-between pb-8">
          <Link href="/quotations" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</Link>
          <button type="submit" disabled={saving || rateStatus === 'EXPIRED'}
            className="bg-gtl-navy text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gtl-navy-dark disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar cotización →'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ChargesBlock({
  title, subtitle, items, total, currency, accent = 'navy', onUpdate, onAdd, onRemove,
}: {
  title: string
  subtitle: string
  items: LineItem[]
  setItems: (v: LineItem[]) => void
  total: number
  currency: string
  accent?: 'navy' | 'orange' | 'gray'
  onUpdate: (i: number, f: 'label' | 'amount', v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const dotColor = accent === 'orange' ? 'bg-gtl-orange' : accent === 'gray' ? 'bg-gray-400' : 'bg-gtl-navy'
  const totalTextColor = accent === 'orange' ? 'text-gtl-orange' : accent === 'gray' ? 'text-gray-600' : 'text-gtl-navy'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">— {subtitle}</span>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={item.label} onChange={e => onUpdate(i, 'label', e.target.value)}
              placeholder="Concepto"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" step="0.01" min="0" value={item.amount || ''} onChange={e => onUpdate(i, 'amount', e.target.value)}
                placeholder="0.00"
                className="w-28 pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy text-right font-mono" />
            </div>
            <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={onAdd}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
        <span>+</span> Agregar ítem
      </button>

      <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500 uppercase font-semibold">Subtotal</span>
        <span className={`font-bold font-mono text-base ${totalTextColor}`}>${total.toFixed(2)} {currency}</span>
      </div>
    </div>
  )
}
