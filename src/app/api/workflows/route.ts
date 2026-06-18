import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workflows = await prisma.workflow.findMany({ include: { template: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(workflows)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const wf = await prisma.workflow.create({ data: body, include: { template: true } })
  return NextResponse.json(wf)
}
