import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '@/lib/google'
import { sendWAMessageWithResult } from '@/lib/whatsapp'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const appointment = await prisma.appointment.findUnique({ where: { id: params.id }, include: { contact: true } })
  if (!appointment) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 })

  const title = String(body.title || appointment.title).trim()
  const description = body.description !== undefined ? String(body.description || '') : appointment.description
  const startAt = body.startAt ? new Date(body.startAt) : appointment.startAt
  const endAt = body.endAt ? new Date(body.endAt) : appointment.endAt
  if (!title || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json({ error: 'Revisa el título y el horario de la cita.' }, { status: 400 })
  }

  if (appointment.contact && body.assignedToId) {
    await prisma.contact.update({ where: { id: appointment.contact.id }, data: { assignedToId: body.assignedToId } })
  }

  let googleEventId = appointment.googleEventId
  let googleWarning: string | null = null
  const calendarOptions = {
    title,
    description: description || undefined,
    startAt,
    endAt,
    attendeeEmail: body.notifyClient ? appointment.contact?.email ?? undefined : undefined,
  }
  try {
    if (googleEventId) await updateCalendarEvent(googleEventId, calendarOptions)
    else googleEventId = await createCalendarEvent(calendarOptions) ?? null
  } catch (error) {
    googleWarning = error instanceof Error ? error.message : 'Google Calendar no pudo actualizarse.'
  }

  let notified = appointment.notified
  if (body.notifyClient && appointment.remoteJid) {
    const fecha = startAt.toLocaleString('es-EC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Guayaquil' })
    const text = `📅 Actualización de cita: *${title}* será el ${fecha}.`
    try {
      const sent = await sendWAMessageWithResult(appointment.remoteJid, text)
      await prisma.whatsAppMessage.upsert({
        where: { messageId: sent.messageId },
        update: { content: text, timestamp: new Date() },
        create: { remoteJid: sent.jid, fromMe: true, content: text, messageId: sent.messageId, timestamp: new Date(), contactId: appointment.contactId },
      })
      notified = true
    } catch { /* Se conserva la cita aunque WhatsApp esté desconectado. */ }
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: { title, description, startAt, endAt, googleEventId, notified },
    include: { contact: { select: { name: true, phone: true, assignedTo: { select: { id: true, name: true } } } } },
  })
  return NextResponse.json({ ...updated, googleWarning })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const appointment = await prisma.appointment.findUnique({ where: { id: params.id } })
  if (!appointment) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 })

  let googleWarning: string | null = null
  if (appointment.googleEventId) {
    try { await deleteCalendarEvent(appointment.googleEventId) }
    catch (error) { googleWarning = error instanceof Error ? error.message : 'Google Calendar no pudo eliminarse.' }
  }
  await prisma.appointment.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true, googleWarning })
}
