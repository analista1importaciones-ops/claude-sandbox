'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LineItem = { label: string; amount: number }

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

const INCOTEMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'FCA', 'CPT', 'CIP']

const PERMISOS = [
  'Licencias de Importación', 'INEN', 'MIPRO', 'ARCSA',
  'No Requiere Registro Sanitario', 'Agrocalidad', 'Fitosanitario', 'Zoosanitario',
]

function calcBodegaje(mode: string, cbm: number): number {
  if (mode === 'FCL20') return 450
  if (mode === 'FCL40' || mode === 'FCL40HC') return 550
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
    return 350
  }
  if (city === 'OTRA') {
    if (mode === 'FCL20') return 750
    if (mode === 'FCL40' || mode === 'FCL40HC') return 800
    const m = Math.ceil(cbm) || 1
    return Math.min(140 + (m - 1) * 50, 590)
  }
  if (mode === 'FCL20') return 250
  if (mode === 'FCL40' || mode === 'FCL40HC') return 300
  return 100
}

function calcAgenteAduana(mode: string): number {
  return mode === 'AIR' ? 277.15 : 332.58
}

function calcTransporteLabel(city: string): string {
  if (city === 'UIO') return 'Transporte Interno - UIO'
  if (city === 'OTRA') return 'Transporte Nacional'
  return 'Transporte Interno - GYE'
}

function buildOtherCharges(mode: string, cbm: number, city: string, permiso: string): LineItem[] {
  return [
    { label: 'Agente de Aduana / Despacho Aduanero', amount: calcAgenteAduana(mode) },
    { label: calcTransporteLabel(city), amount: calcTransporte(mode, city, cbm) },
    { label: permiso, amount: 0 },
    { label: 'Seguro Todo Riesgo / Póliza', amount: 0 },
    { label: 'Bodegaje Aprox. Patio', amount: calcBodegaje(mode, cbm) },
    { label: 'Aranceles Aduana Ecuador', amount: 0 },
  ]
}

function inferDeliveryCity(otherCharges: LineItem[]): string {
  const transport = otherCharges.find(i =>
    i.label.includes('UIO') || i.label.includes('GYE') || i.label === 'Transporte Nacional'
  )
  if (!transport) return 'GYE'
  if (transport.label.includes('UIO')) return 'UIO'
  if (transport.label === 'Transporte Nacional') return 'OTRA'
  return 'GYE'
}

function inferPermiso(otherCharges: LineItem[]): string {
  const known = new Set([
    'Agente de Aduana / Despacho Aduanero',
    'Transporte Interno - GYE', 'Transporte Interno - UIO', 'Transporte Nacional',
    'Seguro Todo Riesgo / Póliza', 'Bodegaje Aprox. Patio', 'Aranceles Aduana Ecuador',
  ])
  const permiso = otherCharges.find(i => PERMISOS.includes(i.label) || (!known.has(i.label) && i !== otherCharges[0]))
  return permiso?.label ?? 'Licencias de Importación'
}

export default function EditQuotationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [quotationNumber, setQuotationNumber] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

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
  const [issueDate, setIssueDate] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('GYE')
  const [permiso, setPermiso] = useState('Licencias de Importación')
  const [transitDaysMin, setTransitDaysMin] = useState<number | null>(null)
  const [transitDaysMax, setTransitDaysMax] = useState<number | null>(null)
  const [frequency, setFrequency] = useState('')

  const [intlCharges, setIntlCharges] = useState<LineItem[]>([])
  const [localCharges, setLocalCharges] = useState<LineItem[]>([])
  const [otherCharges, setOtherCharges] = useState<LineItem[]>([])

  const [autoCalcBlock3, setAutoCalcBlock3] = useState(false)

  useEffect(() => {
    fetch(`/api/quotations/${params.id}`)
      .then(r => r.json())
      .then(q => {
        setQuotationNumber(q.number)
        setCustomerName(q.customerName)
        setCustomerEmail(q.customerEmail ?? '')
        setCustomerPhone(q.customerPhone ?? '')
        setOriginPort(q.originPort)
        setDestinationPort(q.destinationPort)
        setOriginCountry(q.originCountry)
        setDestinationCountry(q.destinationCountry ?? 'Ecuador')
        setMode(q.mode)
        setIncoterm(q.incoterm)
        setCurrency(q.currency)
        setCbm(q.cbm ? String(q.cbm) : '')
        setContainers(q.containers ? String(q.containers) : '')
        setGrossWeightKg(q.grossWeightKg ? String(q.grossWeightKg) : '')
        setProductDesc(q.productDesc ?? '')
        setIssueDate(q.issueDate.split('T')[0])
        setValidUntil(q.validUntil.split('T')[0])
        setNotes(q.notes ?? '')
        setTransitDaysMin(q.transitDaysMin)
        setTransitDaysMax(q.transitDaysMax)
        setFrequency(q.frequency ?? '')
        setIntlCharges(q.intlCharges)
        setLocalCharges(q.localCharges)
        setOtherCharges(q.otherCharges)
        setDeliveryCity(inferDeliveryCity(q.otherCharges))
        setPermiso(inferPermiso(q.otherCharges))
      })
      .catch(() => setError('No se pudo cargar la cotización.'))
      .finally(() => setLoading(false))
  }, [params.id])

  // Recalculate block 3 only when user explicitly toggles auto-calc
  useEffect(() => {
    if (!autoCalcBlock3) return
    setOtherCharges(buildOtherCharges(mode, parseFloat(cbm) || 0, deliveryCity, permiso))
  }, [autoCalcBlock3, mode, cbm, deliveryCity, permiso])

  const isLCL = mode === 'LCL'
  const isAIR = mode === 'AIR'
  const isFCL = mode === 'FCL20' || mode === 'FCL40' || mode === 'FCL40HC'

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

    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/quotations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName, customerEmail: customerEmail || undefined, customerPhone: customerPhone || undefined,
          originPort, destinationPort, originCountry, destinationCountry,
          mode, incoterm, currency,
          cbm: (isLCL || isAIR) ? cbm || undefined : undefined,
          containers: isFCL ? containers || undefined : undefined,
          grossWeightKg: grossWeightKg || undefined,
          productDesc: productDesc || undefined,
          issueDate, validUntil,
          transitDaysMin, transitDaysMax,
          frequency: frequency || undefined,
          intlCharges: intlCharges.filter(r => r.label),
          localCharges: localCharges.filter(r => r.label),
          otherCharges: otherCharges.filter(r => r.label),
          intlTotal, localTotal, otherTotal, grandTotal,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push(`/quotations/${params.id}`)
      router.refresh()
    } catch {
      setError('Ocurrió un error al guardar los cambios.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400 text-sm">Cargando cotización...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/quotations" className="hover:text-gray-600">Cotizaciones</Link>
        <span>/</span>
        <Link href={`/quotations/${params.id}`} className="hover:text-gray-600 font-mono">{quotationNumber}</Link>
        <span>/</span>
        <span className="text-gray-600">Editar</span>
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Cotización</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{quotationNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Datos del cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente *</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} type="email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puerto destino *</label>
              <input value={destinationPort} onChange={e => setDestinationPort(e.target.value.toUpperCase())} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País origen</label>
              <input value={originCountry} onChange={e => setOriginCountry(e.target.value)}
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
              <select value={incoterm} onChange={e => setIncoterm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                {INCOTEMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{isFCL ? 'Contenedores' : 'CBM (m³)'}</label>
              {isFCL
                ? <input type="number" min="1" value={containers} onChange={e => setContainers(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
                : <input type="number" step="0.001" min="0" value={cbm} onChange={e => setCbm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Peso bruto (kg)</label>
              <input type="number" step="0.01" min="0" value={grossWeightKg} onChange={e => setGrossWeightKg(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de carga</label>
              <input value={productDesc} onChange={e => setProductDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Permiso de importación</label>
              <select value={permiso} onChange={e => setPermiso(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy bg-white">
                {PERMISOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
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

        {/* Bloque 1 */}
        <ChargesBlock
          title="Bloque 1 — Transporte Internacional"
          subtitle={`por ${isFCL ? 'contenedor' : isAIR ? 'kg' : 'CBM'}`}
          items={intlCharges}
          total={intlTotal}
          currency={currency}
          onUpdate={(i, f, v) => updateLine(intlCharges, setIntlCharges, i, f, v)}
          onAdd={() => addLine(intlCharges, setIntlCharges)}
          onRemove={i => removeLine(intlCharges, setIntlCharges, i)}
        />

        {/* Bloque 2 */}
        <ChargesBlock
          title="Bloque 2 — Gastos Locales GTL"
          subtitle="fijos por operación"
          items={localCharges}
          total={localTotal}
          currency={currency}
          accent="orange"
          onUpdate={(i, f, v) => updateLine(localCharges, setLocalCharges, i, f, v)}
          onAdd={() => addLine(localCharges, setLocalCharges)}
          onRemove={i => removeLine(localCharges, setLocalCharges, i)}
        />

        {/* Bloque 3 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Bloque 3 — Otros Costos en Destino</h2>
            </div>
            <button type="button"
              onClick={() => { setAutoCalcBlock3(true); setOtherCharges(buildOtherCharges(mode, parseFloat(cbm) || 0, deliveryCity, permiso)) }}
              className="text-xs text-gtl-navy border border-gtl-navy rounded px-2 py-1 hover:bg-blue-50 transition-colors">
              Recalcular automático
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-[18px]">Edita los valores directamente o pulsa "Recalcular" para aplicar las tarifas automáticas.</p>

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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy resize-none" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="flex items-center justify-between pb-8">
          <Link href={`/quotations/${params.id}`} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</Link>
          <button type="submit" disabled={saving}
            className="bg-gtl-navy text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gtl-navy-dark disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar cambios →'}
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
  total: number
  currency: string
  accent?: 'navy' | 'orange'
  onUpdate: (i: number, f: 'label' | 'amount', v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const dotColor = accent === 'orange' ? 'bg-gtl-orange' : 'bg-gtl-navy'
  const totalTextColor = accent === 'orange' ? 'text-gtl-orange' : 'text-gtl-navy'

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
