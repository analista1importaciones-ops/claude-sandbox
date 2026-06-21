import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasCredentials = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const token = await prisma.googleToken.findFirst({ select: { updatedAt: true, expiryDate: true } })

  return NextResponse.json({
    hasCredentials,
    connected: Boolean(token),
    updatedAt: token?.updatedAt ?? null,
    expiresAt: token ? new Date(Number(token.expiryDate)).toISOString() : null,
    appointmentNotifyConfigured: Boolean(process.env.APPOINTMENT_NOTIFY_PHONE || process.env.APPOINTMENT_ADVISOR_PHONE),
    appointmentReminderMinutes: process.env.APPOINTMENT_REMINDER_MINUTES ?? '1440,60',
  })
}
