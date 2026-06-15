import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RateStatusBadge from '@/components/RateStatusBadge'

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'replaced'

async function getRates(statusFilter: StatusFilter, search?: string) {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (statusFilter === 'active') { where.replacedById = null; where.validUntil = { gt: sevenDaysFromNow } }
  else if (statusFilter === 'expiring') { where.replacedById = null; where.validUntil = { gte: now, lte: sevenDaysFromNow } }
  else if (statusFilter === 'expired') { where.replacedById = null; where.validUntil = { lt: now } }
  else if (statusFilter === 'replaced') { where.replacedById = { not: null } }
  if (search) {
    where.OR = [
      { originPort: { contains: search, mode: 'insensitive' } },
      { destinationPort: { contains: search, mode: 'insensitive' } },
      { originCountry: { contains: search, mode: 'insensitive' } },
      { rateSheet: { carrier: { name: { contains: search, mode: 'insensitive' } } } },
    ]
  }
  return prisma.rate.findMany({ where, orderBy: { createdAt: 'desc' }, include: { rateSheet: { include: { carrier: true } } } })
}

async function getStats() {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const [active, expiringSoon, expired, replaced] = await Promise.all([
    prisma.rate.count({ where: { replacedById: null, validUntil: { gt: sevenDaysFromNow } } }),
    prisma.rate.count({ where: { replacedById: null, validUntil: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.rate.count({ where: { replacedById: null, validUntil: { lt: now } } }),
    prisma.rate.count({ where: { replacedById: { not: null } } }),
  ])
  return { active, expiringSoon, expired, replaced }
}

export default async function RatesPage({ searchParams }: { searchParams: { status?: string; search?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const statusFilter = (searchParams.status as StatusFilter) ?? 'all'
  const search = searchParams.search
  const [rates, stats] = await Promise.all([getRates(statusFilter, search), getStats()])

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: stats.active + stats.expiringSoon + stats.expired + stats.replaced },
    { key: 'active', label: 'Vigentes', count: stats.active },
    { key: 'expiring', label: 'Por vencer', count: stats.expiringSoon },
    { key: 'expired', label: 'Vencidas', count: stats.expired },
    { key: 'replaced', label: 'Reemplazadas', count: stats.replaced },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarifas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Repositorio de fletes y surcharges por agente/naviera</p>
        </div>
        <Link href="/rates/new" className="bg-gtl-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Nueva Tarifa
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Vigentes', count: stats.active, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { label: 'Por vencer', count: stats.expiringSoon, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
          { label: 'Vencidas', count: stats.expired, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
          { label: 'Reemplazadas', count: stats.replaced, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} ${c.border} border rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${c.text}`}>{c.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <Link key={tab.key} href={`/rates?status=${tab.key}${search ? `&search=${search}` : ''}`}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${statusFilter === tab.key ? 'border-gtl-navy text-gtl-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.label} <span className="ml-1 text-xs opacity-60">({tab.count})</span>
              </Link>
            ))}
          </div>
          <form method="GET" action="/rates" className="py-2">
            <input type="hidden" name="status" value={statusFilter} />
            <input name="search" defaultValue={search} placeholder="Buscar ruta, agente..." className="w-52 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy" />
          </form>
        </div>

        {rates.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🗂️</div>
            <p className="text-gray-600 font-medium">No hay tarifas{statusFilter !== 'all' ? ' en esta categoría' : ''}</p>
            <p className="text-gray-400 text-sm mt-1">{statusFilter === 'all' ? 'Cargue su primera tarifa para comenzar.' : 'Pruebe con otro filtro.'}</p>
            {statusFilter === 'all' && (
              <Link href="/rates/new" className="inline-block mt-4 bg-gtl-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark">+ Nueva Tarifa</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Ruta</th>
                  <th className="px-4 py-3 text-left font-medium">Modalidad</th>
                  <th className="px-4 py-3 text-left font-medium">Agente / Naviera</th>
                  <th className="px-4 py-3 text-right font-medium">Flete base</th>
                  <th className="px-4 py-3 text-left font-medium">Vence</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map(rate => (
                  <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <RateStatusBadge validUntil={rate.validUntil} replacedById={rate.replacedById} showExpiry />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {rate.originPort} → {rate.destinationPort}
                      <div className="text-xs text-gray-400 font-normal">{rate.originCountry}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{modeLabels[rate.mode] ?? rate.mode}</td>
                    <td className="px-4 py-3 text-gray-600">{rate.rateSheet.carrier.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {rate.freightRate ? `$${Number(rate.freightRate).toFixed(2)}` : '—'}
                      <div className="text-xs text-gray-400 font-sans">{rate.freightUnit ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(rate.validUntil).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/rates/${rate.id}`} className="text-gtl-navy text-xs font-medium hover:underline whitespace-nowrap">Ver →</Link>
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
