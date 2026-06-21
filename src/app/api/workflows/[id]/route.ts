import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function workflowPatchData(body: Record<string, unknown>) {
  const serviceTag = body.serviceTag ? String(body.serviceTag) : null
  return {
    ...body,
    ...(body.serviceTag !== undefined
      ? { serviceTag: serviceTag && serviceTag !== 'Todos' && serviceTag !== 'Todos los servicios' ? serviceTag : null }
      : {}),
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const wf = await prisma.workflow.update({ where: { id: params.id }, data: workflowPatchData(body), include: { template: true } })
  return NextResponse.json(wf)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.workflow.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
