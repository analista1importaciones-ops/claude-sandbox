import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google'
import { sendWAMessage } from '@/lib/whatsapp'
import { sendAppointmentEmail } from '@/lib/email'
import { runContactCreatedWorkflows } from '@/lib/workflows'

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
  const { title, description, startAt, endAt, contactId, contactName, remoteJid, notifyClient } = body
  const shouldNotifyClient = notifyClient ?? Boolean(remoteJid)
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)
  let contact = contactId ? await prisma.contact.findUnique({ where: { id: contactId } }) : null
  if (!contact && remoteJid) {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
    contact = await prisma.contact.findFirst({ where: { phone: { contains: phone.slice(-8) } } })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: contactName || phone,
          phone,
          waName: contactName || null,
          source: 'OTRO',
          serviceLabel: 'OTRO',
          tags: ['WhatsApp'],
        },
      })
      await runContactCreatedWorkflows(contact)
    }
    await prisma.whatsAppMessage.updateMany({
      where: { remoteJid },
      data: { contactId: contact.id },
    })
  }
  let googleEventId: string | null = null
  try {
    googleEventId = await createCalendarEvent({ title, description, startAt: startDate, endAt: endDate, attendeeEmail: shouldNotifyClient ? contact?.email ?? undefined : undefined }) ?? null
  } catch { /* Google not connected */ }
  const appointment = await prisma.appointment.create({
    data: { title, description, startAt: startDate, endAt: endDate, contactId: contact?.id ?? null, remoteJid: remoteJid || null, googleEventId },
  })
  let notified = false
  if (shouldNotifyClient && remoteJid) {
    const fecha = startDate.toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })
    const msg = `📅 Hola${contact ? ` ${contact.name}` : ''}, te confirmamos tu cita: *${title}* el ${fecha}.`
    try {
      const jid = await sendWAMessage(remoteJid, msg)
      await prisma.whatsAppMessage.create({ data: { remoteJid: jid, fromMe: true, content: msg, messageId: `apt_${Date.now()}`, timestamp: new Date(), contactId: contact?.id ?? null } })
      notified = true
    } catch { /* WA not connected */ }
  }
  if (shouldNotifyClient && contact?.email) {
    await sendAppointmentEmail({ to: contact.email, title, description, startAt: startDate, endAt: endDate, contactName: contact.name })
    notified = true
  }
  if (session.user?.email) {
    await sendAppointmentEmail({ to: session.user.email, title, description, startAt: startDate, endAt: endDate, contactName: contact?.name, internal: true })
  }
  const updated = notified
    ? await prisma.appointment.update({ where: { id: appointment.id }, data: { notified: true } })
    : appointment
  return NextResponse.json(updated)
}
