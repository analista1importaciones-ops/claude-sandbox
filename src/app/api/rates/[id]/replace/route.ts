import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { newRateId } = await req.json()

  await prisma.rate.update({
    where: { id: params.id },
    data: { replacedById: newRateId },
  })

  return NextResponse.json({ success: true })
}
