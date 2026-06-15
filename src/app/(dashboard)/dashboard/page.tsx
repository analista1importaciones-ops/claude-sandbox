import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RateStatusBadge from '@/components/RateStatusBadge'

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [active, expiringSoon, expired, quotationsThisMonth, expiringSoonRates, recentRates] = await Promise.all([
    prisma.rate.count({ where: { replacedById: null, validUntil: { gt: sevenDaysFromNow } } }),
    prisma.rate.count({ where: { replacedById: null, validUntil: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.rate.count({ where: { replacedById: null, validUntil: { lt: now } } }),
    prisma.quotation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.rate.findMany({
      where: { replacedById: null, validUntil: { gte: now, lte: sevenDaysFromNow } },
      orderBy: { validUntil: 'asc' },
      take: 5,
      include: { rateSheet: { include: { carrier: true } } },
    }),
    prisma.rate.findMany({
      where: { replacedById: null, validUntil: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { rateSheet: { include: { carrier: true } } },
    }),
  ])

  const stats = [
    { label: 'Tarifas Vigentes', value: active, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', href: '/rates?status=active' },
    { label: 'Por Vencer', value: expiringSoon, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', href: '/rates?status=expiring', alert: expiringSoon > 0 },
    { label: 'Vencidas', value: expired, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', href: '/rates?status=expired', alert: expired > 0 },
    { label: 'Cotizaciones este mes', value: quotationsThisMonth, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', href: '/quotations' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {now.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/rates/new" className="bg-gtl-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors">
          + Nueva Tarifa
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className={`${s.bg} ${s.border} border rounded-xl p-5 hover:shadow-sm transition-shadow block`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-sm text-gray-600 mt-1 font-medium">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Expiring alerts */}
      {expiringSoonRates.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <span>⚠</span> Tarifas por vencer esta semana
          </h2>
          <div className="space-y-2">
            {expiringSoonRates.map(r => {
              const days = Math.ceil((r.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <Link key={r.id} href={`/rates/${r.id}`}
                  className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 hover:shadow-sm transition-shadow">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{r.originPort} → {r.destinationPort}</span>
                    <span className="text-gray-400 ml-2">{modeLabels[r.mode]}</span>
                    <span className="text-gray-400 ml-2">· {r.rateSheet.carrier.name}</span>
                  </div>
                  <span className="text-orange-600 text-xs font-medium whitespace-nowrap">
                    {days <= 0 ? 'Vence hoy' : `en ${days} día${days !== 1 ? 's' : ''}`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent rates */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Últimas tarifas cargadas</h2>
          <Link href="/rates" className="text-xs text-gtl-navy hover:underline">Ver todas →</Link>
        </div>
        {recentRates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No hay tarifas cargadas aún.</p>
            <Link href="/rates/new" className="inline-block mt-3 text-gtl-navy text-sm font-medium hover:underline">
              + Cargar primera tarifa
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRates.map(r => (
              <Link key={r.id} href={`/rates/${r.id}`}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-1 rounded transition-colors">
                <div>
                  <span className="text-sm font-medium text-gray-800">{r.originPort} → {r.destinationPort}</span>
                  <span className="text-xs text-gray-400 ml-2">{modeLabels[r.mode]} · {r.rateSheet.carrier.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {r.freightRate && <span className="text-sm font-mono text-gray-700">${Number(r.freightRate).toFixed(2)}</span>}
                  <RateStatusBadge validUntil={r.validUntil} replacedById={r.replacedById} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
