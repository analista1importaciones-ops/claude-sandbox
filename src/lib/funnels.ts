import { prisma } from './prisma'
import { normalizeServiceText } from './service-tags'

export const DEFAULT_FUNNELS = [
  {
    id: 'funnel-cargas',
    name: 'CARGAS',
    aliases: ['CARGA'],
    stages: ['LEAD NUEVO', 'CONTACTADO', 'CALIFICADO', 'DOCUMENTOS RECIBIDOS', 'COTIZACION ENVIADA', 'NEGOCIACION', 'SEGUIMIENTO', 'APROBADO'],
  },
  {
    id: 'funnel-cursos',
    name: 'CURSOS',
    aliases: ['CURSO'],
    stages: ['LEAD NUEVO', 'CONTACTADO', 'INTERESADO', 'SEGUIMIENTO', 'RESERVA', 'INSCRITO', 'PENDIENTE DE INICIO', 'ALUMNO ACTIVO', 'OPORTUNIDAD GTL'],
  },
  {
    id: 'funnel-asesoria',
    name: 'ASESORIA',
    aliases: ['ASESORIAS', 'ASESORÍA', 'ASESORÍAS'],
    stages: ['LEAD NUEVO', 'CONTACTADO', 'DIAGNOSTICO', 'PROPUESTA ENVIADA', 'SEGUIMIENTO', 'CERRADO'],
  },
  {
    id: 'funnel-clientes-antiguos',
    name: 'CLIENTES ANTIGUOS',
    aliases: ['CLIENTE ANTIGUO', 'ANTIGUOS'],
    stages: ['CLIENTE ACTIVO', 'REMARKETING', 'CONTACTADO', 'OPORTUNIDAD', 'SEGUIMIENTO', 'REACTIVADO'],
  },
] as const

export function legacyStageForFunnelStage(stageName: string | null | undefined) {
  const value = normalizeServiceText(stageName)
  if (!value) return 'PAUTA'
  if (value.includes('cotizacion') || value.includes('propuesta')) return 'COTIZADO'
  if (value.includes('seguimiento') || value.includes('remarketing')) return 'SEGUIMIENTO'
  if (value.includes('negociacion')) return 'NEGOCIANDO'
  if (value.includes('aprobado') || value.includes('inscrito') || value.includes('reactivado') || value.includes('cerrado')) return 'CERRADO_GANADO'
  if (value.includes('contactado')) return 'CONTACTADO'
  return 'PAUTA'
}

export async function ensureDefaultFunnels() {
  const existing = await prisma.funnel.findMany({
    include: { stages: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  for (const config of DEFAULT_FUNNELS) {
    const funnel = existing.find(item => item.id === config.id)
      ?? existing.find(item =>
        [config.name, ...config.aliases].some(alias => normalizeServiceText(alias) === normalizeServiceText(item.name))
      )
      ?? await prisma.funnel.create({
      data: { id: config.id, name: config.name },
      include: { stages: true },
    })

    if (funnel.stages.length > 0) continue

    for (let index = 0; index < config.stages.length; index += 1) {
      const stageName = config.stages[index]
      const found = funnel.stages.some(stage => normalizeServiceText(stage.name) === normalizeServiceText(stageName))
      if (found) continue
      await prisma.funnelStage.create({
        data: {
          id: `${funnel.id}-stage-${index + 1}`,
          funnelId: funnel.id,
          name: stageName,
          order: index,
          color: stageColor(index),
        },
      }).catch(() => null)
    }
  }

  return prisma.funnel.findMany({
    include: { stages: { orderBy: { order: 'asc' } }, _count: { select: { deals: true, workflows: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getFunnelStageByName(funnelNames: string[], stageNames: string[]) {
  const funnels = await ensureDefaultFunnels()
  const funnel = funnels.find(item =>
    funnelNames.some(name => normalizeServiceText(name) === normalizeServiceText(item.name))
  )
  if (!funnel) return null
  return funnel.stages.find(stage =>
    stageNames.some(name => normalizeServiceText(name) === normalizeServiceText(stage.name))
  ) ?? funnel.stages[0] ?? null
}

function stageColor(index: number) {
  const colors = ['#94A3B8', '#60A5FA', '#FBBF24', '#F97316', '#A78BFA', '#22C55E', '#14B8A6', '#16A34A']
  return colors[index % colors.length]
}
