import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RateStatusBadge from '@/components/RateStatusBadge'
import { computeRateStatus, statusLabel, SURCHARGE_FIELDS, formatExpiryLabel } from '@/lib/rateStatus'
import { Decimal } from '@prisma/client/runtime/library'

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

function toNum(v: Decimal | null | undefined): number {
  return v ? Number(v) : 0
}

export default async function RateDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const rate = await prisma.rate.findUnique({
    where: { id: params.id },
    include: {
      rateSheet: { include: { carrier: true } },
      replacedBy: { include: { rateSheet: { include: { carrier: true } } } },
    },
  })

  if (!rate) notFound()

  // History: all rates for same route + carrier
  const history = await prisma.rate.findMany({
    where: {
      originPort: rate.originPort,
      destinationPort: rate.destinationPort,
      mode: rate.mode,
      rateSheet: { carrierId: rate.rateSheet.carrierId },
      id: { not: rate.id },
    },
    include: { rateSheet: { include: { carrier: true } } },
    orderBy: { validFrom: 'desc' },
  })

  const status = computeRateStatus(rate.validUntil, rate.replacedById)
  const isLCL = rate.mode === 'LCL'

  // Build non-zero surcharge rows
  const surchargeRows = SURCHARGE_FIELDS.map(f => {
    const val = toNum(rate[f.key as keyof typeof rate] as Decimal | null)
    if (!val) return null
    return { label: f.key === 'otherCharges' && rate.otherChargesDesc ? rate.otherChargesDesc : f.label, value: val }
  }).filter(Boolean) as { label: string; value: number }[]

  const totalAllIn = toNum(rate.freightRate) + surchargeRows.reduce((s, r) => s + r.value, 0)

  const daysLeft = Math.ceil((rate.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/rates" className="hover:text-gray-600">Tarifas</Link>
        <span>/</span>
        <span className="text-gray-600">{rate.originPort} → {rate.destinationPort}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {rate.originPort} → {rate.destinationPort}
              <span className="ml-3 text-lg font-normal text-gray-500">— {modeLabels[rate.mode]}</span>
            </h1>
            <p className="text-gray-500 mt-1">{rate.rateSheet.carrier.name} · {rate.originCountry}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/rates/new?duplicate=${rate.id}`}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Duplicar
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <RateStatusBadge validUntil={rate.validUntil} replacedById={rate.replacedById} showExpiry />
          {status === 'ACTIVE' || status === 'EXPIRING_SOON' ? (
            <span className="text-sm text-gray-500">
              {daysLeft > 0 ? `${daysLeft} días restantes` : 'Vence hoy'}
            </span>
          ) : null}
        </div>

        {status === 'EXPIRING_SOON' && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ⚠ Esta tarifa vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}. Confirme con el agente antes de usar en cotizaciones.
          </div>
        )}
        {status === 'EXPIRED' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ✕ Tarifa vencida. No puede utilizarse en nuevas cotizaciones.
          </div>
        )}
        {status === 'REPLACED' && rate.replacedBy && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            Esta tarifa fue reemplazada.{' '}
            <Link href={`/rates/${rate.replacedBy.id}`} className="text-gtl-navy font-medium hover:underline">
              Ver tarifa vigente →
            </Link>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Información de la tarifa</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-400 block">Ruta</span><span className="font-medium">{rate.originPort} → {rate.destinationPort}</span></div>
          <div><span className="text-gray-400 block">Modalidad</span><span className="font-medium">{modeLabels[rate.mode]}</span></div>
          <div><span className="text-gray-400 block">Moneda</span><span className="font-medium">{rate.currency}</span></div>
          <div><span className="text-gray-400 block">Válido desde</span><span className="font-medium">{rate.validFrom.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div><span className="text-gray-400 block">Válido hasta</span><span className={`font-medium ${status === 'EXPIRED' ? 'text-red-600' : status === 'EXPIRING_SOON' ? 'text-orange-600' : ''}`}>{rate.validUntil.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          {rate.transitDaysMin && rate.transitDaysMax && (
            <div><span className="text-gray-400 block">Tránsito</span><span className="font-medium">{rate.transitDaysMin}–{rate.transitDaysMax} días</span></div>
          )}
          {rate.frequency && (
            <div><span className="text-gray-400 block">Frecuencia</span><span className="font-medium">{rate.frequency}</span></div>
          )}
          <div><span className="text-gray-400 block">Rate Sheet</span><span className="font-medium">{rate.rateSheet.reference}</span></div>
          {rate.rateSheet.receivedAt && (
            <div><span className="text-gray-400 block">Recibido el</span><span className="font-medium">{rate.rateSheet.receivedAt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          )}
        </div>
        {rate.commodity && <div className="mt-3 text-sm"><span className="text-gray-400">Carga: </span>{rate.commodity}</div>}
        {rate.notes && <div className="mt-2 text-sm text-gray-500 italic">{rate.notes}</div>}
      </div>

      {/* Freight breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Desglose de cargos {isLCL ? '(por CBM)' : '(por contenedor)'}</h2>
        <div className="space-y-2">
          {toNum(rate.freightRate) > 0 && (
            <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
              <span className="font-medium text-gray-800">Ocean Freight</span>
              <span className="font-mono text-gray-900">${toNum(rate.freightRate).toFixed(2)}</span>
            </div>
          )}
          {surchargeRows.map((row, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-mono text-gray-700">${row.value.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-2 mt-1 bg-gtl-navy/5 rounded-lg px-3">
            <span className="font-bold text-gtl-navy">TOTAL ALL-IN</span>
            <span className="font-bold text-gtl-navy font-mono">${totalAllIn.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Historial de versiones — {rate.originPort} → {rate.destinationPort} {modeLabels[rate.mode]}</h2>
          <div className="space-y-2">
            {history.map(h => {
              const hs = computeRateStatus(h.validUntil, h.replacedById)
              return (
                <Link key={h.id} href={`/rates/${h.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gtl-navy/30 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${hs === 'ACTIVE' ? 'bg-green-500' : hs === 'EXPIRING_SOON' ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{h.rateSheet.reference}</div>
                      <div className="text-xs text-gray-400">
                        {h.validFrom.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} – {h.validUntil.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {toNum(h.freightRate) > 0 && <span className="text-sm font-mono text-gray-700">${toNum(h.freightRate).toFixed(2)}/CBM</span>}
                    <span className="text-xs text-gray-400">{statusLabel(hs)}</span>
                    <span className="text-gray-300">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      {(status === 'ACTIVE' || status === 'EXPIRING_SOON') && (
        <div className="bg-gtl-navy rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold">Usar esta tarifa en una cotización</div>
            <div className="text-blue-300 text-sm">Se pre-cargarán todos los valores automáticamente</div>
          </div>
          <Link
            href={`/quotations/new?rateId=${rate.id}`}
            className="bg-gtl-orange text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors whitespace-nowrap"
          >
            Crear cotización →
          </Link>
        </div>
      )}
    </div>
  )
}
