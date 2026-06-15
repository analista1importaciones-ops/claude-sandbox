import { computeRateStatus, statusLabel, statusColors, formatExpiryLabel, type ComputedStatus } from '@/lib/rateStatus'

interface RateStatusBadgeProps {
  validUntil: Date | string
  replacedById?: string | null
  showExpiry?: boolean
}

export default function RateStatusBadge({ validUntil, replacedById, showExpiry = false }: RateStatusBadgeProps) {
  const date = typeof validUntil === 'string' ? new Date(validUntil) : validUntil
  const status: ComputedStatus = computeRateStatus(date, replacedById)
  const colors = statusColors(status)

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {statusLabel(status)}
      {showExpiry && status !== 'REPLACED' && (
        <span className="opacity-75 ml-0.5">· {formatExpiryLabel(date, status)}</span>
      )}
    </span>
  )
}
