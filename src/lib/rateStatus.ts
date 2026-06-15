export type ComputedStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REPLACED'

export function computeRateStatus(validUntil: Date, replacedById?: string | null): ComputedStatus {
  if (replacedById) return 'REPLACED'
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (validUntil < now) return 'EXPIRED'
  if (validUntil <= sevenDaysFromNow) return 'EXPIRING_SOON'
  return 'ACTIVE'
}

export function statusLabel(status: ComputedStatus): string {
  const labels: Record<ComputedStatus, string> = {
    ACTIVE: 'Vigente',
    EXPIRING_SOON: 'Por vencer',
    EXPIRED: 'Vencida',
    REPLACED: 'Reemplazada',
  }
  return labels[status]
}

export function statusColors(status: ComputedStatus) {
  const colors: Record<ComputedStatus, { bg: string; text: string; dot: string; border: string }> = {
    ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
    EXPIRING_SOON: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
    EXPIRED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
    REPLACED: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-200' },
  }
  return colors[status]
}

export function daysUntilExpiry(validUntil: Date): number {
  const now = new Date()
  return Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatExpiryLabel(validUntil: Date, status: ComputedStatus): string {
  if (status === 'EXPIRED') return 'Vencida'
  if (status === 'REPLACED') return 'Reemplazada'
  const days = daysUntilExpiry(validUntil)
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  if (days <= 7) return `En ${days} días`
  return validUntil.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const SURCHARGE_FIELDS = [
  { key: 'baf', label: 'BAF' },
  { key: 'caf', label: 'CAF' },
  { key: 'isps', label: 'ISPS' },
  { key: 'thcOrigin', label: 'THC Origen' },
  { key: 'thcDestination', label: 'THC Destino / CFS' },
  { key: 'docFee', label: 'Doc Fee' },
  { key: 'handling', label: 'Handling' },
  { key: 'vgm', label: 'VGM' },
  { key: 'customsOrigin', label: 'Aduana Origen' },
  { key: 'manifest', label: 'Manifest' },
  { key: 'pickUp', label: 'Pick Up' },
  { key: 'overlength', label: 'Overlength' },
  { key: 'seal', label: 'Seal / Sello' },
  { key: 'telexRelease', label: 'Telex Release' },
  { key: 'ams', label: 'AMS / ENS' },
  { key: 'gri', label: 'GRI' },
  { key: 'pss', label: 'PSS' },
  { key: 'congestion', label: 'Congestion Surcharge' },
  { key: 'cleaningFee', label: 'Cleaning Fee' },
  { key: 'portCharges', label: 'Port Charges' },
  { key: 'warehouse', label: 'Warehouse / Bodega' },
  { key: 'insurance', label: 'Seguro Internacional' },
  { key: 'otherCharges', label: 'Otros' },
] as const

export type SurchargeKey = typeof SURCHARGE_FIELDS[number]['key']

export const COMMON_PORTS = [
  { code: 'NINGBO', name: 'Ningbo', country: 'China' },
  { code: 'SHANGHAI', name: 'Shanghai', country: 'China' },
  { code: 'SHENZHEN', name: 'Shenzhen', country: 'China' },
  { code: 'GUANGZHOU', name: 'Guangzhou', country: 'China' },
  { code: 'QINGDAO', name: 'Qingdao', country: 'China' },
  { code: 'XIAMEN', name: 'Xiamen', country: 'China' },
  { code: 'HONGKONG', name: 'Hong Kong', country: 'Hong Kong' },
  { code: 'MIAMI', name: 'Miami', country: 'USA' },
  { code: 'LOSANGELES', name: 'Los Angeles', country: 'USA' },
  { code: 'NEWYORK', name: 'New York', country: 'USA' },
  { code: 'ROTTERDAM', name: 'Rotterdam', country: 'Netherlands' },
  { code: 'HAMBURG', name: 'Hamburg', country: 'Germany' },
  { code: 'VALENCIA', name: 'Valencia', country: 'Spain' },
  { code: 'BARCELONA', name: 'Barcelona', country: 'Spain' },
  { code: 'MUMBAI', name: 'Mumbai', country: 'India' },
  { code: 'CHENNAI', name: 'Chennai', country: 'India' },
  { code: 'BUENAVENTURA', name: 'Buenaventura', country: 'Colombia' },
  { code: 'CALLAO', name: 'Callao', country: 'Peru' },
  { code: 'MANZANILLO', name: 'Manzanillo', country: 'Mexico' },
  { code: 'GYE', name: 'Guayaquil', country: 'Ecuador' },
  { code: 'MEC', name: 'Manta', country: 'Ecuador' },
  { code: 'TPB', name: 'Puerto Bolívar', country: 'Ecuador' },
]
