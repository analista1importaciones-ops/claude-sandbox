import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type StageInput = { id?: string; name?: string; color?: string }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = String(body.name || '').trim().toUpperCase()
  const stages = (Array.isArray(body.stages) ? body.stages : []) as StageInput[]
  const cleanStages = stages
    .map((stage, order) => ({
      id: stage.id || null,
      name: String(stage.name || '').trim().toUpperCase(),
      color: String(stage.color || '#6B7280'),
      order,
    }))
    .filter(stage => stage.name)

  if (!name || cleanStages.length === 0) {
    return NextResponse.json({ error: 'El embudo necesita nombre y al menos una etapa.' }, { status: 400 })
  }
  if (new Set(cleanStages.map(stage => stage.name)).size !== cleanStages.length) {
    return NextResponse.json({ error: 'No se pueden repetir nombres de etapas.' }, { status: 400 })
  }

  const current = await prisma.funnel.findUnique({
    where: { id: params.id },
    include: { stages: { include: { _count: { select: { deals: true, workflows: true } } } } },
  })
  if (!current) return NextResponse.json({ error: 'Embudo no encontrado.' }, { status: 404 })

  const keptIds = new Set(cleanStages.map(stage => stage.id).filter(Boolean))
  const blockedRemoval = current.stages.find(stage =>
    !keptIds.has(stage.id) && (stage._count.deals > 0 || stage._count.workflows > 0)
  )
  if (blockedRemoval) {
    return NextResponse.json({
      error: `No se puede eliminar ${blockedRemoval.name}: tiene clientes o workflows vinculados.`,
    }, { status: 409 })
  }

  try {
    const result = await prisma.$transaction(async tx => {
      await tx.funnel.update({ where: { id: params.id }, data: { name } })
      const removedIds = current.stages.filter(stage => !keptIds.has(stage.id)).map(stage => stage.id)
      if (removedIds.length) await tx.funnelStage.deleteMany({ where: { id: { in: removedIds } } })

      const existingStages = cleanStages.filter(stage => stage.id && current.stages.some(item => item.id === stage.id))
      for (const stage of existingStages) {
        await tx.funnelStage.update({
          where: { id: stage.id! },
          data: { name: `__editing_${stage.id}` },
        })
      }
      for (const stage of existingStages) {
        await tx.funnelStage.update({
          where: { id: stage.id! },
          data: { name: stage.name, color: stage.color, order: stage.order },
        })
      }
      for (const stage of cleanStages.filter(stage => !stage.id)) {
        await tx.funnelStage.create({
          data: {
            id: `${params.id}-stage-${Date.now()}-${stage.order}`,
            funnelId: params.id,
            name: stage.name,
            color: stage.color,
            order: stage.order,
          },
        })
      }

      return tx.funnel.findUniqueOrThrow({
        where: { id: params.id },
        include: { stages: { orderBy: { order: 'asc' } }, _count: { select: { deals: true, workflows: true } } },
      })
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Funnels] update failed', error)
    return NextResponse.json({ error: 'No se pudo guardar. Revisa que los nombres no estén repetidos.' }, { status: 400 })
  }
}
