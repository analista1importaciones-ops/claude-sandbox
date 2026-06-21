import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function workflowData(body: Record<string, unknown>) {
  const delayDays = Math.max(0, Number(body.delayDays) || 0)
  const delayHours = Math.max(0, Number(body.delayHours) || 0)
  const delayMinutes = Math.max(0, Number(body.delayMinutes) || 0)
  const serviceTag = body.serviceTag ? String(body.serviceTag) : null
  return {
    name: String(body.name || ''),
    trigger: body.trigger as never,
    stage: body.stage as never,
    serviceTag: serviceTag && serviceTag !== 'Todos' && serviceTag !== 'Todos los servicios' ? serviceTag : null,
    delayDays,
    delayMinutes: (delayHours * 60) + delayMinutes,
    templateId: body.templateId ? String(body.templateId) : null,
    active: body.active === undefined ? true : Boolean(body.active),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const workflows = await prisma.workflow.findMany({ include: { template: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(workflows)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const data = workflowData(body)
    if (!data.name || !data.trigger || !data.templateId) {
      return NextResponse.json({ error: 'Faltan nombre, activador o plantilla.' }, { status: 400 })
    }
    const wf = await prisma.workflow.create({ data, include: { template: true } })
    return NextResponse.json(wf)
  } catch (error) {
    console.error('[Workflow] create failed', error)
    const message = error instanceof Error ? error.message : 'No se pudo crear el workflow.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
