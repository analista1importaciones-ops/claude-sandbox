'use client'

interface DuplicateRateModalProps {
  carrier: string
  route: string
  mode: string
  existingValidUntil: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

const modeLabels: Record<string, string> = {
  LCL: 'LCL', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

export default function DuplicateRateModal({ carrier, route, mode, existingValidUntil, onCancel, onConfirm, loading }: DuplicateRateModalProps) {
  const date = new Date(existingValidUntil).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-orange-600 text-lg">⚠</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Tarifa duplicada detectada</h3>
            <p className="text-sm text-gray-500 mt-1">Ya existe una tarifa vigente para esta ruta y agente.</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Agente:</span>
            <span className="font-medium text-gray-900">{carrier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ruta:</span>
            <span className="font-medium text-gray-900">{route} — {modeLabels[mode] ?? mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vigente hasta:</span>
            <span className="font-medium text-orange-700">{date}</span>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-5">
          ¿Desea guardar esta nueva tarifa y marcar la anterior como <strong>REEMPLAZADA</strong>? La tarifa anterior quedará en el historial y no será eliminada.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Sí, reemplazar y guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
