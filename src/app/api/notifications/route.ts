import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const [appointments, tasks, messages] = await Promise.all([
    prisma.appointment.findMany({
      where: { startAt: { gte: now, lte: nextSevenDays } },
      orderBy: { startAt: 'asc' },
      take: 12,
      include: { contact: { select: { name: true, assignedTo: { select: { name: true } } } } },
    }),
    prisma.activity.findMany({
      where: { type: 'TAREA', completedAt: null, OR: [{ dueAt: null }, { dueAt: { lte: nextSevenDays } }] },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 8,
      include: { contact: { select: { id: true, name: true, assignedTo: { select: { name: true } } } } },
    }),
    prisma.scheduledMessage.findMany({
      where: { sent: false, status: 'PENDING', sendAt: { lte: nextSevenDays } },
      orderBy: { sendAt: 'asc' },
      take: 8,
      include: { contact: { select: { name: true, assignedTo: { select: { name: true } } } } },
    }),
  ])

  const items = [
    ...appointments.map(item => ({
      id: `appointment-${item.id}`,
      type: 'CITA',
      title: item.title,
      detail: `${item.contact?.name || 'Cliente'} · ${item.contact?.assignedTo?.name || 'Sin asesor'}`,
      at: item.startAt,
      href: '/appointments',
      urgent: !item.notified || item.startAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000,
    })),
    ...tasks.map(item => ({
      id: `task-${item.id}`,
      type: 'TAREA',
      title: item.text,
      detail: `${item.contact?.name || 'Sin contacto'} · ${item.contact?.assignedTo?.name || 'Sin asesor'}`,
      at: item.dueAt || item.createdAt,
      href: item.contact?.id ? `/crm/contacts/${item.contact.id}` : '/crm',
      urgent: Boolean(item.dueAt && item.dueAt < now),
    })),
    ...messages.map(item => ({
      id: `message-${item.id}`,
      type: 'MENSAJE',
      title: item.body,
      detail: `${item.contact?.name || 'Contacto WhatsApp'} · ${item.contact?.assignedTo?.name || 'Sin asesor'}`,
      at: item.sendAt,
      href: '/workflows',
      urgent: item.sendAt < now,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return NextResponse.json({ items: items.slice(0, 20), urgent: items.filter(item => item.urgent).length })
}
