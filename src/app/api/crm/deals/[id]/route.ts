import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queueOrSendDealStageWorkflow } from '@/lib/workflows'
import { SERVICE_LABEL_TAGS, getPrimaryFunnelTag, mergeContactTags } from '@/lib/service-tags'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const dealData = {
    ...(body.stage ? { stage: body.stage } : {}),
    ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null } : {}),
    ...(body.currency ? { currency: body.currency } : {}),
    ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
  }
  const previous = await prisma.deal.findUnique({ where: { id: params.id }, include: { contact: true } })
  const deal = await prisma.deal.update({ where: { id: params.id }, data: dealData, include: { contact: true } })
  let workflowContact = deal.contact

  if (workflowContact) {
    const serviceTag = SERVICE_LABEL_TAGS[workflowContact.serviceLabel]
    const funnelTag = getPrimaryFunnelTag(body.funnel)
    const requestedTag = typeof body.serviceTag === 'string' ? body.serviceTag : null
    const requiredTags = [serviceTag, funnelTag, requestedTag].filter((tag): tag is string => Boolean(tag))
    if (requiredTags.length > 0) {
      const tags = mergeContactTags(workflowContact.tags ?? [], requiredTags)
      if (tags.length !== workflowContact.tags.length) {
        workflowContact = await prisma.contact.update({
          where: { id: workflowContact.id },
          data: { tags },
        })
      }
    }
  }

  if (body.stage && previous?.stage !== body.stage) {
    const workflows = await prisma.workflow.findMany({
      where: { active: true, trigger: 'DEAL_STAGE_CHANGED', stage: body.stage },
      include: { template: true },
    })
    const uniqueWorkflows = []
    const seenWorkflowKeys = new Set<string>()
    for (const workflow of workflows) {
      const key = [
        workflow.stage ?? '',
        workflow.serviceTag ?? 'todos',
        workflow.templateId ?? '',
        workflow.delayDays,
        workflow.delayMinutes,
      ].join('|')
      if (seenWorkflowKeys.has(key)) continue
      seenWorkflowKeys.add(key)
      uniqueWorkflows.push(workflow)
    }
    const workflowResults = []
    for (const wf of uniqueWorkflows) {
      if (workflowContact) {
        const result = await queueOrSendDealStageWorkflow(wf, workflowContact, { dealId: deal.id, stage: body.stage }).catch(e => {
          console.error('[Workflow] send failed', { workflowId: wf.id, contactId: workflowContact?.id }, e)
          return { status: 'skipped' as const, reason: 'send_failed' }
        })
        workflowResults.push({ workflowId: wf.id, name: wf.name, serviceTag: wf.serviceTag, result })
      }
    }
    console.log('[Workflow] stage change', {
      dealId: deal.id,
      contactId: workflowContact?.id,
      from: previous?.stage,
      to: body.stage,
      workflows: workflowResults,
    })
    return NextResponse.json({ ...deal, contact: workflowContact, workflowResults })
  }
  return NextResponse.json({ ...deal, contact: workflowContact })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.deal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
