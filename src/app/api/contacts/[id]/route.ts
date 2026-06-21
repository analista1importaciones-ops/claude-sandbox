import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SERVICE_LABEL_TAGS, getServiceLabelForTags, mergeContactTags } from '@/lib/service-tags'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const existing = await prisma.contact.findUnique({
    where: { id: params.id },
    select: { tags: true, serviceLabel: true },
  })
  const tags = mergeContactTags(
    existing?.tags ?? [],
    Array.isArray(body.tags) ? body.tags : []
  )
  const serviceLabel = getServiceLabelForTags(tags, body.serviceLabel ?? existing?.serviceLabel ?? 'OTRO')
  const serviceTag = SERVICE_LABEL_TAGS[serviceLabel]
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      company: body.company ?? null,
      waName: body.waName ?? null,
      tags: serviceTag ? mergeContactTags(tags, [serviceTag]) : tags,
      serviceLabel: serviceLabel as never,
    },
  })
  if (body.remoteJid) {
    await prisma.whatsAppMessage.updateMany({
      where: { remoteJid: body.remoteJid },
      data: { contactId: contact.id },
    })
  }
  return NextResponse.json(contact)
}
