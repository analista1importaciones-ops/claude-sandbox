interface AlertBadgeProps {
  count: number
  variant?: 'warning' | 'danger' | 'info'
}

export default function AlertBadge({ count, variant = 'warning' }: AlertBadgeProps) {
  if (count === 0) return null

  const variantClasses = {
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }

  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${variantClasses[variant]}`}>
      {count}
    </span>
  )
}
