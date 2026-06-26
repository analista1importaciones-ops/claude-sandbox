import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureDefaultFunnels } from '@/lib/funnels'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const funnels = await ensureDefaultFunnels()
  return NextResponse.json(funnels)
}
