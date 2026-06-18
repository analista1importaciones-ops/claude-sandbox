import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STAGE_LABELS: Record<string, string> = {
  PAUTA: 'Pauta', CONTACTADO: 'Contactado', COTIZADO: 'Cotizado',
  SEGUIMIENTO: 'Seguimiento', NEGOCIANDO: 'Negociando',
  CERRADO_GANADO: 'Cerrado/Ganado', PERDIDO: 'Perdido',
}

const STAGE_COLORS: Record<string, string> = {
  PAUTA: 'bg-gray-400', CONTACTADO: 'bg-blue-400', COTIZADO: 'bg-indigo-400',
  SEGUIMIENTO: 'bg-yellow-400', NEGOCIANDO: 'bg-orange-400',
  CERRADO_GANADO: 'bg-green-500', PERDIDO: 'bg-red-400',
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const [
    deals,
    dealsThisMonth,
    dealsLastMonth,
    contacts,
    quotationsThisMonth,
    courierThisMonth,
    appointmentsUpcoming,
    unreadConversations,
    pendingScheduledMessages,
  ] = await Promise.all([
    prisma.deal.findMany({ select: { stage: true, estimatedValue: true, currency: true } }),
    prisma.deal.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.deal.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.contact.count(),
    prisma.quotation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.courierQuotation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.appointment.count({ where: { startAt: { gte: now } } }),
    prisma.waConversation.count({ where: { unreadCount: { gt: 0 } } }),
    prisma.scheduledMessage.count({ where: { sent: false, sendAt: { lte: endOfToday } } }),
  ])

  const stages = ['PAUTA', 'CONTACTADO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIANDO', 'CERRADO_GANADO', 'PERDIDO']
  const pipeline = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage)
    const value = stageDeals.reduce((sum, d) => sum + (d.estimatedValue ? parseFloat(d.estimatedValue.toString()) : 0), 0)
    return { stage, count: stageDeals.length, value }
  })

  const total = deals.length
  const won = deals.filter(d => d.stage === 'CERRADO_GANADO').length
  const lost = deals.filter(d => d.stage === 'PERDIDO').length
  const wonValue = deals
    .filter(d => d.stage === 'CERRADO_GANADO')
    .reduce((sum, d) => sum + (d.estimatedValue ? parseFloat(d.estimatedValue.toString()) : 0), 0)
  const winRate = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0
  const maxCount = Math.max(...pipeline.map(p => p.count), 1)

  const monthDiff = dealsThisMonth - dealsLastMonth
  const monthTrend = monthDiff > 0 ? `+${monthDiff}` : monthDiff < 0 ? `${monthDiff}` : '='
  const operationMetrics = [
    { label: 'Cotizaciones este mes', value: quotationsThisMonth, href: '/quotations' },
    { label: 'Courier este mes', value: courierThisMonth, href: '/courier' },
    { label: 'Citas próximas', value: appointmentsUpcoming, href: '/appointments' },
    { label: 'Chats sin leer', value: unreadConversations, href: '/whatsapp' },
    { label: 'Mensajes pendientes', value: pendingScheduledMessages, href: '/workflows' },
    { label: 'Contactos CRM', value: contacts, href: '/crm' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Reportes CRM</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500 mt-1">Deals totales</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-green-600">{winRate}%</div>
          <div className="text-sm text-gray-500 mt-1">Tasa de cierre</div>
          <div className="text-xs text-gray-400 mt-0.5">{won} ganados · {lost} perdidos</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-orange-500">${wonValue.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</div>
          <div className="text-sm text-gray-500 mt-1">Revenue cerrado</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-blue-600">{dealsThisMonth}</div>
          <div className="text-sm text-gray-500 mt-1">Deals este mes</div>
          <div className={`text-xs mt-0.5 font-medium ${monthDiff > 0 ? 'text-green-600' : monthDiff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {monthTrend} vs mes anterior
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Pipeline por etapa</h2>
        <div className="space-y-3">
          {pipeline.map(p => (
            <div key={p.stage} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-600 text-right flex-shrink-0">{STAGE_LABELS[p.stage]}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${STAGE_COLORS[p.stage]} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${Math.max((p.count / maxCount) * 100, p.count > 0 ? 4 : 0)}%` }}
                >
                  {p.count > 0 && <span className="text-white text-xs font-bold">{p.count}</span>}
                </div>
              </div>
              <div className="w-28 text-sm text-gray-500 flex-shrink-0">
                {p.value > 0 ? `$${p.value.toLocaleString('es-GT', { minimumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Operación conectada</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {operationMetrics.map(metric => (
            <Link key={metric.label} href={metric.href} className="border border-gray-100 rounded-lg p-4 hover:border-gtl-navy hover:bg-blue-50 transition-colors">
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-500 mt-1">{metric.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
