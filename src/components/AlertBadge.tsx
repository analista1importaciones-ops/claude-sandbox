interface AlertBadgeProps {
  count: number
  variant?: 'success' | 'warning' | 'danger' | 'info'
}

const variantStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

export default function AlertBadge({ count, variant = 'info' }: AlertBadgeProps) {
  if (count === 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]}`}
    >
      {count}
    </span>
  )
}
