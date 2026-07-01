import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runs = await prisma.workflowRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: {
      workflow: {
        select: {
          name: true,
          funnel: { select: { name: true } },
          funnelStage: { select: { name: true } },
        },
      },
      contact: { select: { id: true, name: true, phone: true } },
      scheduledMessages: {
        select: { id: true, status: true, sendAt: true, sentAt: true, lastError: true },
        orderBy: { sendAt: 'asc' },
      },
    },
  })

  return NextResponse.json(runs)
}
