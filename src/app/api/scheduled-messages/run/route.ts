import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runDueScheduledMessages } from '@/lib/workflows'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-cron-secret')
  if (!cronSecret || token !== cronSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await runDueScheduledMessages())
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await runDueScheduledMessages())
}
