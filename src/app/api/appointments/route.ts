import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google'
import { sendWAMessage } from '@/lib/whatsapp'
import { sendAppointmentEmail } from '@/lib/email'
import { runContactCreatedWorkflows } from '@/lib/workflows'

function toWhatsAppJid(phoneOrJid: string | null | undefined) {
  if (!phoneOrJid) return null
  if (phoneOrJid.includes('@')) return phoneOrJid
  const digits = phoneOrJid.replace(/\D/g, '')
  return digits ? `${digits}@s.whatsapp.net` : null
}

function getAppointmentReminderMinutes() {
  const configured = process.env.APPOINTMENT_REMINDER_MINUTES
  const values = configured
    ? configured.split(',').map(value => Number(value.trim())).filter(value => value > 0)
    : [24 * 60, 60]
  return Array.from(new Set(values)).sort((a, b) => b - a)
}

function formatAppointmentDate(date: Date) {
  return date.toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })
}

function formatReminderLead(minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} día${days === 1 ? '' : 's'}`
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} hora${hours === 1 ? '' : 's'}`
  }
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`
}

async function createAppointmentReminders(params: {
  clientJid: string | null
  advisorJid: string | null
  contactId: string | null
  contactName: string | null
  title: string
  startDate: Date
}) {
  const now = new Date()
  const reminders: Array<{ remoteJid: string; body: string; sendAt: Date; contactId?: string | null }> = []
  const appointmentDate = formatAppointmentDate(params.startDate)

  for (const minutesBefore of getAppointmentReminderMinutes()) {
    const sendAt = new Date(params.startDate.getTime() - minutesBefore * 60 * 1000)
    if (sendAt <= now) continue

    const lead = formatReminderLead(minutesBefore)
    if (params.clientJid) {
      reminders.push({
        remoteJid: params.clientJid,
        contactId: params.contactId,
        sendAt,
        body: `⏰ Recordatorio: tu cita *${params.title}* es en ${lead}, el ${appointmentDate}.`,
      })
    }

    if (params.advisorJid) {
      reminders.push({
        remoteJid: params.advisorJid,
        sendAt,
        body: `⏰ Recordatorio interno: cita *${params.title}* con ${params.contactName ?? 'cliente'} en ${lead}, el ${appointmentDate}.`,
      })
    }
  }

  if (reminders.length === 0) return 0
  await prisma.scheduledMessage.createMany({ data: reminders })
  return reminders.length
}

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
  const advisorJid = toWhatsAppJid(process.env.APPOINTMENT_NOTIFY_PHONE || process.env.APPOINTMENT_ADVISOR_PHONE)
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
  let googleCalendarStatus: 'created' | 'not_connected' | 'error' = 'not_connected'
  let googleCalendarError: string | null = null
  try {
    googleEventId = await createCalendarEvent({ title, description, startAt: startDate, endAt: endDate, attendeeEmail: shouldNotifyClient ? contact?.email ?? undefined : undefined }) ?? null
    googleCalendarStatus = googleEventId ? 'created' : 'error'
  } catch (error) {
    googleCalendarError = error instanceof Error ? error.message : 'No se pudo crear el evento en Google Calendar'
    googleCalendarStatus = googleCalendarError.includes('Google no conectado') ? 'not_connected' : 'error'
    console.error('[Appointment] Google Calendar event failed', googleCalendarError)
  }
  const appointment = await prisma.appointment.create({
    data: { title, description, startAt: startDate, endAt: endDate, contactId: contact?.id ?? null, remoteJid: remoteJid || null, googleEventId },
  })
  let notified = false
  let advisorNotified = false
  const clientJid = toWhatsAppJid(remoteJid || contact?.phone)
  if (shouldNotifyClient && clientJid) {
    const fecha = formatAppointmentDate(startDate)
    const msg = `📅 Hola${contact ? ` ${contact.name}` : ''}, te confirmamos tu cita: *${title}* el ${fecha}.`
    try {
      const jid = await sendWAMessage(clientJid, msg)
      await prisma.whatsAppMessage.create({ data: { remoteJid: jid, fromMe: true, content: msg, messageId: `apt_${Date.now()}`, timestamp: new Date(), contactId: contact?.id ?? null } })
      notified = true
    } catch { /* WA not connected */ }
  }
  if (advisorJid) {
    const msg = `📅 Nueva cita creada: *${title}* con ${contact?.name ?? contactName ?? 'cliente'} el ${formatAppointmentDate(startDate)}.${contact?.phone ? ` Tel: ${contact.phone}` : ''}`
    try {
      const jid = await sendWAMessage(advisorJid, msg)
      await prisma.whatsAppMessage.create({ data: { remoteJid: jid, fromMe: true, content: msg, messageId: `apt_internal_${Date.now()}`, timestamp: new Date(), contactId: null } })
      advisorNotified = true
    } catch (error) {
      console.error('[Appointment] advisor WhatsApp notify failed', error)
    }
  }
  if (shouldNotifyClient && contact?.email) {
    await sendAppointmentEmail({ to: contact.email, title, description, startAt: startDate, endAt: endDate, contactName: contact.name })
    notified = true
  }
  if (session.user?.email) {
    await sendAppointmentEmail({ to: session.user.email, title, description, startAt: startDate, endAt: endDate, contactName: contact?.name, internal: true })
  }
  const remindersCreated = await createAppointmentReminders({
    clientJid: shouldNotifyClient ? clientJid : null,
    advisorJid,
    contactId: contact?.id ?? null,
    contactName: contact?.name ?? contactName ?? null,
    title,
    startDate,
  })
  const updated = notified
    ? await prisma.appointment.update({ where: { id: appointment.id }, data: { notified: true } })
    : appointment
  return NextResponse.json({ ...updated, googleCalendarStatus, googleCalendarError, advisorNotified, remindersCreated })
}
