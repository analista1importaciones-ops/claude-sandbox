import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rate = await prisma.rate.findUnique({
    where: { id: params.id },
    include: {
      rateSheet: { include: { carrier: true } },
      replaces: {
        include: { rateSheet: { include: { carrier: true } } },
        orderBy: { validFrom: 'desc' },
      },
      replacedBy: { include: { rateSheet: { include: { carrier: true } } } },
    },
  })

  if (!rate) return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 })

  // Find all rates for same route + carrier for history
  const history = await prisma.rate.findMany({
    where: {
      originPort: rate.originPort,
      destinationPort: rate.destinationPort,
      mode: rate.mode,
      rateSheet: { carrierId: rate.rateSheet.carrierId },
      id: { not: rate.id },
    },
    include: { rateSheet: { include: { carrier: true } } },
    orderBy: { validFrom: 'desc' },
  })

  return NextResponse.json({ ...rate, history })
}
