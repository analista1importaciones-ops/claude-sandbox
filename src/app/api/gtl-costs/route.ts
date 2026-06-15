import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configs = await prisma.gtlCostConfig.findMany({
    where: { category: 'LOCAL_CHARGES' },
    orderBy: { key: 'asc' },
  })

  return NextResponse.json(configs.map(c => ({
    key: c.key,
    label: c.label,
    value: Number(c.value),
  })))
}
