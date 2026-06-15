import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const carriers = await prisma.carrier.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(carriers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, type, contactEmail, contactName, contactPhone, notes } = await req.json()

  const carrier = await prisma.carrier.create({
    data: { name, type, contactEmail, contactName, contactPhone, notes },
  })

  return NextResponse.json(carrier, { status: 201 })
}
