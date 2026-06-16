import React from 'react'

const PIPELINE_STEPS = [
  { key: 'BORRADOR',        label: 'Borrador'       },
  { key: 'ENVIADA',         label: 'Enviada'        },
  { key: 'APROBADA',        label: 'Aprobada'       },
  { key: 'EN_TRANSITO',     label: 'En Tránsito'    },
  { key: 'ARRIBO',          label: 'Arribo'         },
  { key: 'EN_ADUANA',       label: 'En Aduana'      },
  { key: 'NACIONALIZACION', label: 'Nacionalización'},
  { key: 'ENTREGADA',       label: 'Entregada'      },
]

export default function QuotationTimeline({ status }: { status: string }) {
  const isRechazada = status === 'RECHAZADA'
  const currentIndex = isRechazada ? -1 : PIPELINE_STEPS.findIndex(s => s.key === status)

  return (
    <div className="w-full py-4">
      {isRechazada && (
        <div className="flex items-center gap-2 mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <span className="text-red-500 text-sm font-semibold">Cotización Rechazada</span>
        </div>
      )}
      <div className="flex items-center w-full overflow-x-auto">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone    = !isRechazada && idx < currentIndex
          const isCurrent = !isRechazada && idx === currentIndex
          const isFuture  = isRechazada || idx > currentIndex

          return (
            <React.Fragment key={step.key}>
              {/* Step node */}
              <div className="flex flex-col items-center min-w-[64px]">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                    ${isDone    ? 'bg-gtl-navy border-gtl-navy text-white'      : ''}
                    ${isCurrent ? 'bg-white border-gtl-navy text-gtl-navy ring-2 ring-gtl-navy ring-offset-1' : ''}
                    ${isFuture && !isRechazada ? 'bg-white border-gray-300 text-gray-300' : ''}
                    ${isRechazada ? 'bg-white border-gray-300 text-gray-300'   : ''}
                  `}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] text-center leading-tight max-w-[60px]
                    ${isDone    ? 'text-gtl-navy font-medium' : ''}
                    ${isCurrent ? 'text-gtl-navy font-semibold' : ''}
                    ${isFuture  ? 'text-gray-400' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors
                    ${isDone ? 'bg-gtl-navy' : 'bg-gray-200'}
                  `}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
