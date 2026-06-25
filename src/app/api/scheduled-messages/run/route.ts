import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runDueScheduledMessages } from '@/lib/workflows'

async function canRun(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session) return true
  const secret = process.env.CRON_SECRET
  return Boolean(secret && req.nextUrl.searchParams.get('secret') === secret)
}

export async function GET(req: NextRequest) {
  if (!(await canRun(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runDueScheduledMessages())
}

export async function POST(req: NextRequest) {
  if (!(await canRun(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runDueScheduledMessages())
}
