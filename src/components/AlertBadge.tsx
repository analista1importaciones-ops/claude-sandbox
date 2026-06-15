interface AlertBadgeProps {
  count: number
  variant: 'warning' | 'danger' | 'success'
}

const variantStyles = {
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
}

export default function AlertBadge({ count, variant }: AlertBadgeProps) {
  if (count === 0) return null
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${variantStyles[variant]}`}>
      {count}
    </span>
  )
}
