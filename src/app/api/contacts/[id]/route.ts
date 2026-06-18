import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      company: body.company ?? null,
      tags: body.tags ?? [],
      serviceLabel: body.serviceLabel ?? 'OTRO',
    },
  })
  return NextResponse.json(contact)
}
