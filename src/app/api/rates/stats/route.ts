import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [active, expiringSoon, expired, replaced, recentRates] = await Promise.all([
    prisma.rate.count({
      where: { replacedById: null, validUntil: { gt: sevenDaysFromNow } },
    }),
    prisma.rate.count({
      where: { replacedById: null, validUntil: { gte: now, lte: sevenDaysFromNow } },
    }),
    prisma.rate.count({
      where: { replacedById: null, validUntil: { lt: now } },
    }),
    prisma.rate.count({
      where: { replacedById: { not: null } },
    }),
    prisma.rate.findMany({
      where: {
        replacedById: null,
        validUntil: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        originPort: true,
        destinationPort: true,
        mode: true,
        validUntil: true,
        freightRate: true,
        rateSheet: { select: { carrier: { select: { name: true } } } },
      },
    }),
  ])

  const expiringSoonRates = await prisma.rate.findMany({
    where: {
      replacedById: null,
      validUntil: { gte: now, lte: sevenDaysFromNow },
    },
    orderBy: { validUntil: 'asc' },
    select: {
      id: true,
      originPort: true,
      destinationPort: true,
      mode: true,
      validUntil: true,
      rateSheet: { select: { carrier: { select: { name: true } } } },
    },
  })

  return NextResponse.json({ active, expiringSoon, expired, replaced, recentRates, expiringSoonRates })
}
