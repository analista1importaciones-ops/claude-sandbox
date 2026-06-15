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

// ── Tarifas locales automáticas ──────────────────────────────────────────────

function calcBodegaje(mode: string, cbm: number): number {
  if (mode === 'FCL20') return 450
  if (mode === 'FCL40' || mode === 'FCL40HC') return 550
  // LCL / AIR por CBM
  if (cbm <= 2) return 100
  if (cbm <= 3) return 120
  if (cbm <= 4) return 180
  if (cbm <= 5) return 290
  if (cbm <= 10) return 350
  return 450
}

function calcTransporte(mode: string, city: string, cbm: number): number {
  if (city === 'UIO') {
    if (mode === 'FCL20') return 600
    if (mode === 'FCL40' || mode === 'FCL40HC') return 700
    return 350 // LCL / AIR
  }
  if (city === 'OTRA') {
    // Transporte Nacional por CBM
    if (mode === 'FCL20') return 750
    if (mode === 'FCL40' || mode === 'FCL40HC') return 800
    // LCL/AIR por M3 (tabla exacta, $50 por M3 adicional)
    const m = Math.ceil(cbm) || 1
    return Math.min(140 + (m - 1) * 50, 590)
  }
  // GYE
  if (mode === 'FCL20') return 250
  if (mode === 'FCL40' || mode === 'FCL40HC') return 300
  return 100 // LCL / AIR
}

function calcAgenteAduana(mode: string): number {
  return mode === 'AIR' ? 277.15 : 332.58
}

function calcSeguro(fobValue: number): number {
  if (!fobValue || fobValue <= 0) return 0
  return Math.max(fobValue * 0.006, 35)
}

function calcTransporteLabel(city: string): string {
  if (city === 'UIO') return 'Transporte Interno - UIO'
  if (city === 'OTRA') return 'Transporte Nacional'
  return 'Transporte Interno - GYE'
}

const PERMISOS = [
  'Licencias de Importación',
  'INEN',
  'MIPRO',
  'ARCSA',
  'No Requiere Registro Sanitario',
  'Agrocalidad',
  'Fitosanitario',
  'Zoosanitario',
]

function buildIntlTemplate(incoterm: string): LineItem[] {
  if (incoterm === 'CIF') return []
  if (incoterm === 'EXW' || incoterm === 'FCA') {
    return [
      { label: 'Ocean Freight', amount: 0 },
      { label: 'Overlength', amount: 0 },
      { label: 'CFS', amount: 0 },
      { label: 'Doc Fee', amount: 0 },
      { label: 'VGM', amount: 0 },
      { label: 'Manifest', amount: 0 },
      { label: 'Customs Clearance', amount: 0 },
      { label: 'Gate In', amount: 0 },
    ]
  }
  // FOB, DAP, DDP, CPT, CIP
  return [{ label: 'Ocean Freight', amount: 0 }]
}

function buildOtherCharges(mode: string, cbm: number, city: string, fobValue: number, permiso: string): LineItem[] {
  const items: LineItem[] = [
    { label: 'Agente de Aduana / Despacho Aduanero', amount: calcAgenteAduana(mode) },
    { label: calcTransporteLabel(city), amount: calcTransporte(mode, city, cbm) },
    { label: permiso, amount: 0 },
    { label: 'Seguro Todo Riesgo / Póliza', amount: 0 },
    { label: 'Bodegaje Aprox. Patio', amount: calcBodegaje(mode, cbm) },
    { label: 'Aranceles Aduana Ecuador', amount: 0 },
  ]
  return items
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // Delivery city for transport calc
  const [deliveryCity, setDeliveryCity] = useState('GYE')
  // FOB value for insurance calc
  const [fobValue, setFobValue] = useState('')
  // Import permit type
  const [permiso, setPermiso] = useState('Licencias de Importación')

  // Charge blocks
  const [intlCharges, setIntlCharges] = useState<LineItem[]>([])
  const [localCharges, setLocalCharges] = useState<LineItem[]>([])
  const [otherCharges, setOtherCharges] = useState<LineItem[]>(() =>
    buildOtherCharges('LCL', 0, 'GYE', 0, 'Licencias de Importación')
  )

  // Recompute Block 3 when mode / cbm / city / fob / permiso change
  useEffect(() => {
    setOtherCharges(buildOtherCharges(mode, parseFloat(cbm) || 0, deliveryCity, parseFloat(fobValue) || 0, permiso))
  }, [mode, cbm, deliveryCity, fobValue, permiso])

  // Load GTL cost configs (Block 2)
  const loadGtlConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/gtl-costs')
      if (res.ok) {
        const configs: GtlConfig[] = await res.json()
        setLocalCharges(configs.map(c => ({ label: c.label, amount: c.value })))
      }
    } catch {
      setLocalCharges([
        { label: 'Servicio logístico GTL', amount: 225 },
        { label: 'Admisión', amount: 170 },
        { label: 'Transmisión', amount: 115 },
        { label: 'Loc / ISD', amount: 67 },
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
        const now = new Date()
        const vu = new Date(data.validUntil)
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        if (data.replacedById) setRateStatus('REPLACED')
        else if (vu < now) setRateStatus('EXPIRED')
        else if (vu <= sevenDays) setRateStatus('EXPIRING_SOON')
        else setRateStatus('ACTIVE')

        setOriginPort(data.originPort)
        setDestinationPort(data.destinationPort)
        setOriginCountry(data.originCountry)
        setMode(data.mode)
        setCurrency(data.currency || 'USD')

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
  const isAIR = mode === 'AIR'
  const isFCL = mode === 'FCL20' || mode === 'FCL40' || mode === 'FCL40HC'
  const isCIF = incoterm === 'CIF'

  function handleIncotermChange(newIncoterm: string) {
    setIncoterm(newIncoterm)
    if (!rateId) {
      // Only reset Block 1 when not loaded from a rate
      setIntlCharges(buildIntlTemplate(newIncoterm))
    }
    if (newIncoterm === 'CIF') {
      setLocalCharges([])
    } else if (incoterm === 'CIF') {
      loadGtlConfigs()
    }
  }

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
          cbm: (isLCL || isAIR) ? cbm || undefined : undefined,
          containers: isFCL ? containers || undefined : undefined,
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

      {rateStatus === 'EXPIRED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-700">
          ✕ La tarifa seleccionada está <strong>vencida</strong>. No se puede usar. <Link href="/rates" className="underline font-medium">Seleccione otra tarifa</Link>.
        </div>
      )}
      {rateStatus === 'EXPIRING_SOON' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm text-orange-700">
          ⚠ Esta tarifa vence en menos de 7 días. Confirme con el agente antes de enviar al cliente.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Cliente */}
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

        {/* Embarque */}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad entrega</label>
              <select value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                <option value="GYE">Guayaquil (GYE)</option>
                <option value="UIO">Quito (UIO)</option>
                <option value="OTRA">Otra ciudad</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modalidad</label>
              <select value={mode} onChange={e => setMode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                {Object.entries(modeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Incoterm</label>
              <select value={incoterm} onChange={e => handleIncotermChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                {INCOTEMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{isFCL ? 'Contenedores' : 'CBM (m³)'}</label>
              {isFCL
                ? <input type="number" min="1" value={containers} onChange={e => setContainers(e.target.value)} placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
                : <input type="number" step="0.001" min="0" value={cbm} onChange={e => setCbm(e.target.value)} placeholder="0.000"
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
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de carga</label>
              <input value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="Ej: Maquinaria industrial, ropa..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor FOB (USD) <span className="text-gray-400 font-normal">— para seguro</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={fobValue} onChange={e => setFobValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Permiso de importación <span className="text-gray-400 font-normal">— costo se ingresa manualmente en Bloque 3</span></label>
            <select value={permiso} onChange={e => setPermiso(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
              {PERMISOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Fechas */}
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

        {/* Bloque 1 — oculto si CIF */}
        {!isCIF && (
          <ChargesBlock
            title="Bloque 1 — Transporte Internacional"
            subtitle={`por ${isFCL ? 'contenedor' : isAIR ? 'kg/kg' : 'CBM'}`}
            items={intlCharges}
            setItems={setIntlCharges}
            total={intlTotal}
            currency={currency}
            onUpdate={(i, f, v) => updateLine(intlCharges, setIntlCharges, i, f, v)}
            onAdd={() => addLine(intlCharges, setIntlCharges)}
            onRemove={i => removeLine(intlCharges, setIntlCharges, i)}
          />
        )}

        {/* Bloque 2 — oculto si CIF */}
        {!isCIF && (
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
        )}

        {/* Aviso CIF */}
        {isCIF && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>Incoterm CIF:</strong> El proveedor entrega la mercadería en Ecuador. No aplica flete internacional ni gastos locales GTL — solo se cobran los costos en destino (Bloque 3).
          </div>
        )}

        {/* Bloque 3 — auto-calculado */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Bloque 3 — Otros Costos en Destino</h2>
            <span className="text-xs text-gray-400">— calculado automáticamente</span>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-[18px]">
            Calculado según modalidad ({modeLabels[mode]}), ciudad ({deliveryCity}{!isFCL && cbm ? `, ${cbm} CBM` : ''}).
            Puedes editar los valores manualmente.
          </p>

          <div className="space-y-2">
            {otherCharges.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={item.label} onChange={e => updateLine(otherCharges, setOtherCharges, i, 'label', e.target.value)}
                  placeholder="Concepto"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={item.amount || ''} onChange={e => updateLine(otherCharges, setOtherCharges, i, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-28 pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy text-right font-mono" />
                </div>
                <button type="button" onClick={() => removeLine(otherCharges, setOtherCharges, i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => addLine(otherCharges, setOtherCharges)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <span>+</span> Agregar ítem
          </button>

          <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Subtotal</span>
            <span className="font-bold font-mono text-base text-gray-600">${otherTotal.toFixed(2)} {currency}</span>
          </div>
        </div>

        {/* Total General */}
        <div className="bg-gtl-navy rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium">TOTAL GENERAL</div>
              <div className="text-blue-300 text-xs mt-0.5">Transporte + Gastos locales + Otros</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white font-mono">${grandTotal.toFixed(2)}</div>
              <div className="text-blue-300 text-xs mt-0.5">{currency}</div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
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
  setItems?: (v: LineItem[]) => void
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
