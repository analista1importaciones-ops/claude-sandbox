import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google'
import { sendWAMessage } from '@/lib/whatsapp'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prisma.appointment.findMany({
    orderBy: { startAt: 'asc' },
    include: { contact: { select: { name: true, phone: true } } },
  }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { title, description, startAt, endAt, contactId, remoteJid, notifyClient } = body
  const contact = contactId ? await prisma.contact.findUnique({ where: { id: contactId } }) : null
  let googleEventId: string | null = null
  try {
    googleEventId = await createCalendarEvent({ title, description, startAt: new Date(startAt), endAt: new Date(endAt), attendeeEmail: contact?.email ?? undefined }) ?? null
  } catch { /* Google not connected */ }
  const appointment = await prisma.appointment.create({
    data: { title, description, startAt: new Date(startAt), endAt: new Date(endAt), contactId: contactId || null, remoteJid: remoteJid || null, googleEventId },
  })
  if (notifyClient && remoteJid) {
    const fecha = new Date(startAt).toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })
    const msg = `📅 Hola${contact ? ` ${contact.name}` : ''}, te confirmamos tu cita: *${title}* el ${fecha}.`
    try {
      const jid = await sendWAMessage(remoteJid, msg)
      await prisma.whatsAppMessage.create({ data: { remoteJid: jid, fromMe: true, content: msg, messageId: `apt_${Date.now()}`, timestamp: new Date(), contactId: contactId || null } })
    } catch { /* WA not connected */ }
  }
  return NextResponse.json(appointment)
}
