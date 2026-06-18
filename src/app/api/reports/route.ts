import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [deals, dealsThisMonth, dealsLastMonth, contacts] = await Promise.all([
    prisma.deal.findMany({ select: { stage: true, estimatedValue: true, currency: true } }),
    prisma.deal.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.deal.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.contact.count(),
  ])

  const STAGES = ['PAUTA', 'CONTACTADO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIANDO', 'CERRADO_GANADO', 'PERDIDO']

  const pipeline = STAGES.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage)
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.estimatedValue ? parseFloat(d.estimatedValue.toString()) : 0), 0)
    return { stage, count: stageDeals.length, value: totalValue }
  })

  const total = deals.length
  const won = deals.filter(d => d.stage === 'CERRADO_GANADO').length
  const lost = deals.filter(d => d.stage === 'PERDIDO').length
  const wonValue = deals
    .filter(d => d.stage === 'CERRADO_GANADO')
    .reduce((sum, d) => sum + (d.estimatedValue ? parseFloat(d.estimatedValue.toString()) : 0), 0)

  return NextResponse.json({
    pipeline,
    summary: { total, won, lost, winRate: total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0, wonValue, dealsThisMonth, dealsLastMonth, contacts },
  })
}
