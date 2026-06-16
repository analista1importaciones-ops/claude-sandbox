'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COUNTRIES = [
  'Ecuador', 'Colombia', 'Perú', 'Bolivia', 'Chile', 'Argentina', 'Brasil', 'Uruguay', 'Paraguay',
  'Venezuela', 'México', 'Guatemala', 'Panamá', 'Costa Rica', 'Honduras', 'El Salvador', 'Nicaragua',
  'Cuba', 'República Dominicana', 'Puerto Rico',
  'Estados Unidos', 'Canadá',
  'España', 'Francia', 'Alemania', 'Italia', 'Reino Unido', 'Portugal', 'Países Bajos', 'Bélgica',
  'Suiza', 'Austria', 'Suecia', 'Noruega', 'Dinamarca', 'Finlandia', 'Polonia', 'Rusia',
  'China', 'Japón', 'Corea del Sur', 'India', 'Taiwán', 'Hong Kong', 'Singapur', 'Malasia',
  'Turquía', 'Emiratos Árabes Unidos', 'Israel', 'Arabia Saudita',
  'Australia', 'Nueva Zelanda',
  'Sudáfrica', 'Egipto', 'Marruecos',
]

const CARRIERS = ['DHL', 'FedEx', 'UPS', 'TNT', 'Correos del Ecuador', 'Otro']

interface CourierOption {
  carrier: string
  service: string
  priceUsd: string
  transitDays: string
}

const emptyOption = (): CourierOption => ({ carrier: '', service: '', priceUsd: '', transitDays: '' })

export default function NewCourierPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Client
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Shipment
  const [originCountry, setOriginCountry] = useState('')
  const [destinationCountry, setDestinationCountry] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [declaredValueUsd, setDeclaredValueUsd] = useState('')
  const [notes, setNotes] = useState('')

  // Derived weights
  const [volumetricWeight, setVolumetricWeight] = useState<number | null>(null)
  const [chargeableWeight, setChargeableWeight] = useState<number | null>(null)

  // Options
  const [options, setOptions] = useState<CourierOption[]>([emptyOption(), emptyOption(), emptyOption()])
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null)

  // Recalculate volumetric/chargeable weights
  useEffect(() => {
    const l = parseFloat(lengthCm)
    const w = parseFloat(widthCm)
    const h = parseFloat(heightCm)
    const real = parseFloat(weightKg)

    if (l > 0 && w > 0 && h > 0) {
      const vol = (l * w * h) / 5000
      setVolumetricWeight(vol)
      if (real > 0) {
        setChargeableWeight(Math.max(real, vol))
      } else {
        setChargeableWeight(vol)
      }
    } else {
      setVolumetricWeight(null)
      if (real > 0) {
        setChargeableWeight(real)
      } else {
        setChargeableWeight(null)
      }
    }
  }, [lengthCm, widthCm, heightCm, weightKg])

  function updateOption(idx: number, field: keyof CourierOption, value: string) {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }

  function addRow() {
    setOptions(prev => [...prev, emptyOption()])
  }

  function removeRow(idx: number) {
    setOptions(prev => prev.filter((_, i) => i !== idx))
    if (selectedOptionIdx === idx) setSelectedOptionIdx(null)
    else if (selectedOptionIdx !== null && selectedOptionIdx > idx) setSelectedOptionIdx(selectedOptionIdx - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) { setError('El nombre del cliente es obligatorio.'); return }
    if (!originCountry.trim()) { setError('El país de origen es obligatorio.'); return }
    if (!destinationCountry.trim()) { setError('El país de destino es obligatorio.'); return }
    if (!weightKg || parseFloat(weightKg) <= 0) { setError('El peso real es obligatorio.'); return }

    setSaving(true)
    setError('')

    const validOptions = options.filter(o => o.carrier && o.priceUsd)
    const selected = selectedOptionIdx !== null && options[selectedOptionIdx]?.carrier
      ? options[selectedOptionIdx]
      : null

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      originCountry: originCountry.trim(),
      destinationCountry: destinationCountry.trim(),
      weightKg,
      lengthCm: lengthCm || null,
      widthCm: widthCm || null,
      heightCm: heightCm || null,
      volumetricWeightKg: volumetricWeight !== null ? volumetricWeight.toFixed(3) : null,
      chargeableWeightKg: chargeableWeight !== null ? chargeableWeight.toFixed(3) : null,
      productDesc: productDesc.trim() || null,
      declaredValueUsd: declaredValueUsd || null,
      options: validOptions,
      selectedCarrier: selected?.carrier || null,
      selectedService: selected?.service || null,
      selectedPriceUsd: selected?.priceUsd || null,
      notes: notes.trim() || null,
    }

    try {
      const res = await fetch('/api/courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const data = await res.json()
      router.push(`/courier/${data.id}`)
    } catch {
      setError('Ocurrió un error al guardar la cotización. Intente nuevamente.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/courier" className="hover:text-gray-600">Courier</Link>
        <span>/</span>
        <span className="text-gray-600">Nueva cotización</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nueva cotización courier</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="+593 99 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Shipment */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Envío</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País de origen <span className="text-red-500">*</span></label>
              <input
                type="text"
                list="countries-list"
                value={originCountry}
                onChange={e => setOriginCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="Ecuador"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País de destino <span className="text-red-500">*</span></label>
              <input
                type="text"
                list="countries-list"
                value={destinationCountry}
                onChange={e => setDestinationCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="Estados Unidos"
                required
              />
            </div>
          </div>

          <datalist id="countries-list">
            {COUNTRIES.map(c => <option key={c} value={c} />)}
          </datalist>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso real (kg) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="0.000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Largo (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={lengthCm}
                onChange={e => setLengthCm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={widthCm}
                onChange={e => setWidthCm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alto (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Derived weights */}
          {(volumetricWeight !== null || chargeableWeight !== null) && (
            <div className="flex gap-6 text-sm bg-blue-50 rounded-lg px-4 py-3 mb-4">
              {volumetricWeight !== null && (
                <span className="text-blue-700">Peso volumétrico: <strong>{volumetricWeight.toFixed(3)} kg</strong></span>
              )}
              {chargeableWeight !== null && (
                <span className="text-gtl-navy font-semibold">Peso facturable: <strong>{chargeableWeight.toFixed(3)} kg</strong></span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de mercadería</label>
              <input
                type="text"
                value={productDesc}
                onChange={e => setProductDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="Ej: Repuestos electrónicos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor declarado (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={declaredValueUsd}
                onChange={e => setDeclaredValueUsd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Courier options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Opciones de courier</h2>
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-gtl-navy font-medium hover:underline"
            >
              + Agregar fila
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="pb-2 text-left font-medium w-8">Sel.</th>
                  <th className="pb-2 text-left font-medium">Carrier</th>
                  <th className="pb-2 text-left font-medium">Servicio</th>
                  <th className="pb-2 text-right font-medium">Precio USD</th>
                  <th className="pb-2 text-right font-medium">Días</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {options.map((opt, idx) => (
                  <tr key={idx} className={selectedOptionIdx === idx ? 'bg-green-50' : ''}>
                    <td className="py-2 pr-2">
                      <input
                        type="radio"
                        name="selectedOption"
                        checked={selectedOptionIdx === idx}
                        onChange={() => setSelectedOptionIdx(idx)}
                        className="accent-gtl-navy"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={opt.carrier}
                        onChange={e => updateOption(idx, 'carrier', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                      >
                        <option value="">— Carrier —</option>
                        {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={opt.service}
                        onChange={e => updateOption(idx, 'service', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                        placeholder="Express, Economy…"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={opt.priceUsd}
                        onChange={e => updateOption(idx, 'priceUsd', e.target.value)}
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={opt.transitDays}
                        onChange={e => updateOption(idx, 'transitDays', e.target.value)}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-gtl-navy"
                        placeholder="3"
                      />
                    </td>
                    <td className="py-2">
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          aria-label="Eliminar fila"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Seleccione con el radio la opción elegida por el cliente.</p>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Observaciones</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gtl-navy resize-none"
            placeholder="Notas adicionales para esta cotización…"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-gtl-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cotización'}
          </button>
          <Link href="/courier" className="text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
