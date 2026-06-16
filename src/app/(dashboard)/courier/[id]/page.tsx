import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CourierStatusBadge from '@/components/CourierStatusBadge'
import CourierActions from './CourierActions'

interface CourierOption {
  carrier: string
  service: string
  priceUsd: string | number
  transitDays: string | number
}

export default async function CourierDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const q = await prisma.courierQuotation.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true } } },
  })
  if (!q) notFound()

  const options = (q.options as unknown as CourierOption[]) ?? []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/courier" className="hover:text-gray-600">Courier</Link>
        <span>/</span>
        <span className="text-gray-600 font-mono">{q.number}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{q.number}</h1>
              <CourierStatusBadge status={q.status} />
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {q.customerName} · {q.originCountry} → {q.destinationCountry}
            </p>
          </div>
          <CourierActions quotationId={q.id} status={q.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-400 block text-xs">Emisión</span>
            <span className="font-medium">
              {q.issueDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs">Peso real</span>
            <span className="font-medium font-mono">{Number(q.weightKg).toFixed(3)} kg</span>
          </div>
          {q.chargeableWeightKg && (
            <div>
              <span className="text-gray-400 block text-xs">Peso facturable</span>
              <span className="font-medium font-mono text-gtl-navy">{Number(q.chargeableWeightKg).toFixed(3)} kg</span>
            </div>
          )}
        </div>

        {(q.lengthCm || q.widthCm || q.heightCm || q.volumetricWeightKg) && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            {q.lengthCm && q.widthCm && q.heightCm && (
              <span>Dimensiones: <strong>{Number(q.lengthCm)}×{Number(q.widthCm)}×{Number(q.heightCm)} cm</strong></span>
            )}
            {q.volumetricWeightKg && (
              <span>Peso vol.: <strong>{Number(q.volumetricWeightKg).toFixed(3)} kg</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Client */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Cliente</h2>
        <div className="text-sm space-y-1">
          <div className="font-semibold text-gray-900">{q.customerName}</div>
          {q.customerEmail && <div className="text-gray-500">{q.customerEmail}</div>}
          {q.customerPhone && <div className="text-gray-500">{q.customerPhone}</div>}
        </div>
      </div>

      {/* Shipment details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detalle del envío</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400 text-xs block">Origen</span><span className="font-medium">{q.originCountry}</span></div>
          <div><span className="text-gray-400 text-xs block">Destino</span><span className="font-medium">{q.destinationCountry}</span></div>
          {q.productDesc && (
            <div className="col-span-2"><span className="text-gray-400 text-xs block">Mercadería</span><span className="font-medium">{q.productDesc}</span></div>
          )}
          {q.declaredValueUsd && (
            <div><span className="text-gray-400 text-xs block">Valor declarado</span><span className="font-medium font-mono">${Number(q.declaredValueUsd).toFixed(2)} USD</span></div>
          )}
        </div>
      </div>

      {/* Courier options */}
      {options.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gtl-navy" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gtl-navy">Opciones cotizadas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Carrier</th>
                  <th className="px-4 py-2 text-left font-medium">Servicio</th>
                  <th className="px-4 py-2 text-right font-medium">Precio USD</th>
                  <th className="px-4 py-2 text-right font-medium">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {options.map((opt, idx) => {
                  const isSelected = opt.carrier === q.selectedCarrier && opt.service === q.selectedService
                  return (
                    <tr key={idx} className={isSelected ? 'bg-green-50 font-semibold' : ''}>
                      <td className="px-4 py-2.5 text-gray-900">
                        {isSelected && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 align-middle" />}
                        {opt.carrier}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{opt.service || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                        {opt.priceUsd ? `$${Number(opt.priceUsd).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {opt.transitDays ? `${opt.transitDays} días` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {q.selectedCarrier && q.selectedPriceUsd && (
            <div className="bg-gtl-navy px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-white text-xs font-semibold uppercase tracking-wide">Opción seleccionada</div>
                <div className="text-blue-300 text-xs mt-0.5">{q.selectedCarrier}{q.selectedService ? ` · ${q.selectedService}` : ''}</div>
              </div>
              <div className="text-2xl font-bold text-white font-mono">${Number(q.selectedPriceUsd).toFixed(2)}</div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {q.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Observaciones</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 pb-8 text-center">
        Generado por GTL Rate Manager · {q.createdBy.name}
      </div>
    </div>
  )
}
