import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureDefaultFunnels } from '@/lib/funnels'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const funnels = await ensureDefaultFunnels()
    return NextResponse.json(funnels)
  } catch (error) {
    console.error('[Funnels] No se pudieron cargar los embudos:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los embudos.' }, { status: 500 })
  }
}
