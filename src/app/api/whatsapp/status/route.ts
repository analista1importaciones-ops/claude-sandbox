import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureWhatsAppSupervisor, getWAStatus, startWhatsApp } from '@/lib/whatsapp'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ensureWhatsAppSupervisor()
  return NextResponse.json(getWAStatus())
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await startWhatsApp({ manual: true })
  return NextResponse.json({ ok: true })
}
