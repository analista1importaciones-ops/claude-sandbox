import AlertBadge from '@/components/AlertBadge'

const statCards = [
  {
    title: 'Tarifas Vigentes',
    value: 0,
    color: 'green',
    icon: '✓',
    description: 'activas hoy',
  },
  {
    title: 'Por Vencer',
    value: 0,
    color: 'orange',
    icon: '⏱',
    description: 'próximos 7 días',
  },
  {
    title: 'Vencidas',
    value: 0,
    color: 'red',
    icon: '✕',
    description: 'requieren actualización',
  },
  {
    title: 'Cotizaciones',
    value: 0,
    color: 'blue',
    icon: '📋',
    description: 'este mes',
  },
]

const colorMap: Record<string, string> = {
  green: 'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
}

const iconBgMap: Record<string, string> = {
  green: 'bg-green-100',
  orange: 'bg-orange-100',
  red: 'bg-red-100',
  blue: 'bg-blue-100',
}

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del estado de tarifas y cotizaciones</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`bg-white rounded-xl border p-5 shadow-sm ${colorMap[card.color]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{card.title}</span>
              <span className={`text-lg p-2 rounded-lg ${iconBgMap[card.color]}`}>{card.icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs mt-1 opacity-75">{card.description}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin datos aún</h3>
        <p className="text-gray-500">Cargue su primera tarifa para comenzar</p>
        <button className="mt-4 bg-gtl-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gtl-navy-dark transition-colors">
          Cargar tarifa
        </button>
      </div>
    </div>
  )
}
