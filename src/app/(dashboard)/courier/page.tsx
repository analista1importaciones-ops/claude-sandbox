import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CourierStatusBadge from '@/components/CourierStatusBadge'

export default async function CourierPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const quotations = await prisma.courierQuotation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courier Internacional</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cotizaciones para envíos de paquetes con DHL, FedEx, UPS y otros</p>
        </div>
        <Link
          href="/courier/new"
          className="bg-gtl-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nueva cotización courier
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {quotations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-600 font-medium">No hay cotizaciones courier</p>
            <p className="text-gray-400 text-sm mt-1">Cree su primera cotización para un envío de paquetes.</p>
            <Link
              href="/courier/new"
              className="inline-block mt-4 bg-gtl-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark"
            >
              + Nueva cotización courier
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">N°</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Origen → Destino</th>
                  <th className="px-4 py-3 text-right font-medium">Peso</th>
                  <th className="px-4 py-3 text-left font-medium">Carrier</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gtl-navy font-semibold">{q.number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{q.customerName}</td>
                    <td className="px-4 py-3 text-gray-700">{q.originCountry} → {q.destinationCountry}</td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">
                      {q.chargeableWeightKg
                        ? `${Number(q.chargeableWeightKg).toFixed(3)} kg`
                        : `${Number(q.weightKg).toFixed(3)} kg`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{q.selectedCarrier ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {q.selectedPriceUsd ? `$${Number(q.selectedPriceUsd).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <CourierStatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {q.issueDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/courier/${q.id}`} className="text-gtl-navy text-xs font-medium hover:underline">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
