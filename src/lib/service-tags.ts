export const SERVICE_TAGS = [
  'Cursos',
  'Carga',
  'Asesorías',
  'Inspecciones',
  'Búsqueda de proveedores',
  'Courier',
  'Nacionalización',
  'Transporte pesado',
  'Seguro de carga',
]

export const FUNNEL_SERVICE_TAGS: Record<string, string[]> = {
  cursos: ['Cursos', 'Curso'],
  cargas: ['Carga', 'Cargas', 'Logística', 'Logistica', 'Courier', 'Nacionalización', 'Transporte pesado', 'Seguro de carga'],
  asesorias: ['Asesorías', 'Asesorias', 'Asesoría', 'Asesoria'],
  inspecciones: ['Inspecciones', 'Inspección', 'Inspeccion'],
  proveedores: ['Búsqueda de proveedores', 'Busqueda de proveedores', 'Proveedores'],
}

export const SERVICE_LABEL_TAGS: Record<string, string> = {
  CURSOS: 'Cursos',
  CARGA: 'Carga',
  ASESORIAS: 'Asesorías',
  INSPECCIONES: 'Inspecciones',
  BUSQUEDA_PROVEEDORES: 'Búsqueda de proveedores',
  COURIER: 'Courier',
  NACIONALIZACION: 'Nacionalización',
  TRANSPORTE_PESADO: 'Transporte pesado',
  SEGURO_CARGA: 'Seguro de carga',
}

export function normalizeServiceText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
}

export function serviceMatches(expected: string | null | undefined, actual: string | null | undefined) {
  if (!expected) return true
  const expectedNorm = normalizeServiceText(expected)
  const actualNorm = normalizeServiceText(actual)
  if (!expectedNorm) return true
  if (expectedNorm === actualNorm) return true

  return Object.values(FUNNEL_SERVICE_TAGS).some((aliases) => {
    const normalizedAliases = aliases.map(normalizeServiceText)
    return normalizedAliases.includes(expectedNorm) && normalizedAliases.includes(actualNorm)
  })
}

export function mergeContactTags(existing: string[] = [], incoming: string[] = []) {
  const byNormalized = new Map<string, string>()
  for (const tag of [...existing, ...incoming]) {
    const trimmed = tag?.trim()
    if (!trimmed) continue
    byNormalized.set(normalizeServiceText(trimmed), trimmed)
  }
  return Array.from(byNormalized.values())
}

export function getServiceLabelForTags(tags: string[] = [], fallback = 'OTRO') {
  for (const [serviceLabel, serviceTag] of Object.entries(SERVICE_LABEL_TAGS)) {
    if (tags.some(tag => serviceMatches(serviceTag, tag))) return serviceLabel
  }
  return fallback || 'OTRO'
}

export function getPrimaryFunnelTag(funnel: string | null | undefined) {
  if (!funnel || funnel === 'todos') return null
  return FUNNEL_SERVICE_TAGS[funnel]?.[0] ?? null
}
