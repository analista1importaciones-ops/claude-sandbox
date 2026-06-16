import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import QuotationStatusBadge from '@/components/QuotationStatusBadge'

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

const STATUS_TABS = [
  { key: 'all',             label: 'Todas',           filter: undefined             },
  { key: 'borrador',        label: 'Borrador',         filter: 'BORRADOR'            },
  { key: 'enviada',         label: 'Enviadas',         filter: 'ENVIADA'             },
  { key: 'aprobada',        label: 'Aprobadas',        filter: 'APROBADA'            },
  { key: 'en_transito',     label: 'En Tránsito',      filter: 'EN_TRANSITO'         },
  { key: 'arribo',          label: 'Arribo',           filter: 'ARRIBO'              },
  { key: 'en_aduana',       label: 'En Aduana',        filter: 'EN_ADUANA'           },
  { key: 'nacionalizacion', label: 'Nacionalización',  filter: 'NACIONALIZACION'     },
  { key: 'entregada',       label: 'Entregadas',       filter: 'ENTREGADA'           },
  { key: 'rechazada',       label: 'Rechazadas',       filter: 'RECHAZADA'           },
]

export default async function QuotationsPage({ searchParams }: { searchParams: { status?: string; search?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const activeTab = searchParams.status ?? 'all'
  const search = searchParams.search

  const tab = STATUS_TABS.find(t => t.key === activeTab) ?? STATUS_TABS[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (tab.filter) where.status = tab.filter
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { number: { contains: search, mode: 'insensitive' } },
      { originPort: { contains: search, mode: 'insensitive' } },
      { destinationPort: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.quotation.count(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historial de cotizaciones generadas para clientes</p>
        </div>
        <Link href="/quotations/new" className="bg-gtl-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Nueva Cotización
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <Link key={tab.key} href={`/quotations?status=${tab.key}${search ? `&search=${search}` : ''}`}
                className={`px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-gtl-navy text-gtl-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </Link>
            ))}
          </div>
          <form method="GET" action="/quotations" className="py-2">
            <input type="hidden" name="status" value={activeTab} />
            <input name="search" defaultValue={search} placeholder="Buscar cliente, número..." className="w-52 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gtl-navy" />
          </form>
        </div>

        {quotations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">No hay cotizaciones{activeTab !== 'all' ? ' en esta categoría' : ''}</p>
            <p className="text-gray-400 text-sm mt-1">{activeTab === 'all' ? 'Genere su primera cotización desde una tarifa.' : 'Pruebe con otro filtro.'}</p>
            {activeTab === 'all' && (
              <Link href="/quotations/new" className="inline-block mt-4 bg-gtl-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark">+ Nueva Cotización</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">N°</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Ruta</th>
                  <th className="px-4 py-3 text-left font-medium">Modalidad</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
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
                    <td className="px-4 py-3 text-gray-700">{q.originPort} → {q.destinationPort}</td>
                    <td className="px-4 py-3 text-gray-500">{modeLabels[q.mode] ?? q.mode}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">${Number(q.grandTotal).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <QuotationStatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{q.issueDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      <Link href={`/quotations/${q.id}`} className="text-gtl-navy text-xs font-medium hover:underline">Ver →</Link>
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
