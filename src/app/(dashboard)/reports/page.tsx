'use client'

import { useEffect, useState } from 'react'

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

interface StageData { stage: string; count: number; value: number }
interface Summary {
  total: number; won: number; lost: number; winRate: number
  wonValue: number; dealsThisMonth: number; dealsLastMonth: number; contacts: number
}

export default function ReportsPage() {
  const [pipeline, setPipeline] = useState<StageData[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => {
      setPipeline(d.pipeline)
      setSummary(d.summary)
    })
  }, [])

  const maxCount = Math.max(...pipeline.map(p => p.count), 1)
  if (!summary) return <div className="p-6 text-gray-400">Cargando...</div>

  const monthDiff = summary.dealsThisMonth - summary.dealsLastMonth
  const monthTrend = monthDiff > 0 ? `+${monthDiff}` : monthDiff < 0 ? `${monthDiff}` : '='

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Reportes CRM</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-sm text-gray-500 mt-1">Deals totales</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-green-600">{summary.winRate}%</div>
          <div className="text-sm text-gray-500 mt-1">Tasa de cierre</div>
          <div className="text-xs text-gray-400 mt-0.5">{summary.won} ganados · {summary.lost} perdidos</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-orange-500">${summary.wonValue.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</div>
          <div className="text-sm text-gray-500 mt-1">Revenue cerrado</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-3xl font-bold text-blue-600">{summary.dealsThisMonth}</div>
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
        <div className="text-4xl font-bold text-gray-900">{summary.contacts}</div>
        <div>
          <div className="font-medium text-gray-800">Contactos en CRM</div>
          <div className="text-sm text-gray-400">Total de clientes y prospectos</div>
        </div>
      </div>
    </div>
  )
}
