import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50')
  const contacts = await prisma.contact.findMany({
    take: limit,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, company: true, phone: true, email: true },
  })
  return NextResponse.json(contacts)
}
