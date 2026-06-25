export const SERVICE_TAGS = [
  'Cursos',
  'Carga',
  'Asesorias',
  'Inspecciones',
  'Busqueda de proveedores',
  'Courier',
  'Nacionalizacion',
  'Transporte pesado',
  'Seguro de carga',
] as const

export const FUNNEL_SERVICE_TAGS = ['Cursos', 'Carga'] as const

export const SERVICE_LABEL_TAGS: Record<string, string> = {
  CURSOS: 'Cursos',
  CARGA: 'Carga',
  ASESORIAS: 'Asesorias',
  INSPECCIONES: 'Inspecciones',
  BUSQUEDA_PROVEEDORES: 'Busqueda de proveedores',
  COURIER: 'Courier',
  NACIONALIZACION: 'Nacionalizacion',
  TRANSPORTE_PESADO: 'Transporte pesado',
  SEGURO_CARGA: 'Seguro de carga',
  OTRO: 'Otro',
}

export function normalizeServiceText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function serviceMatches(expected: string | null | undefined, values: Array<string | null | undefined>) {
  if (!expected) return true
  const normalizedExpected = normalizeServiceText(expected)
  return values.some(value => normalizeServiceText(value) === normalizedExpected)
}

export function mergeContactTags(current: string[] | null | undefined, next: Array<string | null | undefined>) {
  const tags = [...(current ?? [])]
  for (const tag of next) {
    const clean = tag?.trim()
    if (!clean) continue
    if (!tags.some(existing => normalizeServiceText(existing) === normalizeServiceText(clean))) {
      tags.push(clean)
    }
  }
  return tags
}

export function getServiceLabelForTags(tags: string[] | null | undefined) {
  const normalizedTags = (tags ?? []).map(normalizeServiceText)
  const entry = Object.entries(SERVICE_LABEL_TAGS).find(([, label]) =>
    normalizedTags.includes(normalizeServiceText(label))
  )
  return entry?.[0] ?? 'OTRO'
}

export function getPrimaryFunnelTag(tags: string[] | null | undefined) {
  return FUNNEL_SERVICE_TAGS.find(tag =>
    (tags ?? []).some(value => normalizeServiceText(value) === normalizeServiceText(tag))
  ) ?? null
}
