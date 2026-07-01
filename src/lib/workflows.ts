import { prisma } from './prisma'
import { sendWAMediaMessageWithResult, sendWAMessageWithResult } from './whatsapp'
import { generateCRMWhatsAppMessage } from './openai'

type WorkflowTemplate = {
  body: string
  mediaUrl?: string | null
  mediaType?: string | null
  mediaName?: string | null
} | null

type WorkflowStepWithTemplate = {
  id?: string
  order: number
  delayDays: number
  delayHours?: number
  delayMinutes?: number
  templateId?: string | null
  template: WorkflowTemplate
}

type WorkflowWithSteps = {
  id?: string
  name?: string
  delayDays: number
  delayHours?: number
  delayMinutes?: number
  trigger?: string
  stage?: string | null
  serviceTag?: string | null
  funnelId?: string | null
  funnelStageId?: string | null
  templateId?: string | null
  template: WorkflowTemplate
  steps?: WorkflowStepWithTemplate[]
}

type WorkflowContact = {
  id: string
  name: string
  company: string | null
  phone: string | null
  tags?: string[]
  serviceLabel?: string | null
}

type WorkflowContext = {
  dealId?: string | null
  stage?: string | null
}

type DealStageWorkflowTarget = {
  funnelStageId?: string | null
  funnelId?: string | null
  stage?: string | null
}

type DealForWorkflow = {
  id: string
  stage: string
  funnelId: string | null
  funnelStageId: string | null
  updatedAt?: Date
  contact: WorkflowContact | null
  funnelStage?: { name: string } | null
}

declare global {
  var __scheduledMessageRunnerStarted: boolean
  var __scheduledMessageRunnerBusy: boolean
}

if (global.__scheduledMessageRunnerStarted === undefined) global.__scheduledMessageRunnerStarted = false
if (global.__scheduledMessageRunnerBusy === undefined) global.__scheduledMessageRunnerBusy = false

export function renderWorkflowMessage(template: string, contact: WorkflowContact) {
  return template
    .replaceAll('{{nombre}}', contact.name ?? '')
    .replaceAll('{{empresa}}', contact.company ?? '')
}

async function renderWorkflowMessageWithAI(template: string, contact: WorkflowContact, workflow: WorkflowWithSteps) {
  let text = renderWorkflowMessage(template, contact)
  if (!text.includes('{{ia_mensaje}}') && !text.includes('{{ai_message}}')) return text

  const recent = await prisma.whatsAppMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { timestamp: 'desc' },
    take: 8,
  })
  const recentMessages = recent.reverse().map(m => `${m.fromMe ? 'GTL' : contact.name}: ${m.content}`)
  const aiMessage = await generateCRMWhatsAppMessage({
    contactName: contact.name,
    company: contact.company,
    phone: contact.phone,
    stage: workflow.stage,
    trigger: workflow.trigger,
    recentMessages,
  })

  return text
    .replaceAll('{{ia_mensaje}}', aiMessage)
    .replaceAll('{{ai_message}}', aiMessage)
}

function getWhatsAppJid(phone: string) {
  if (phone.includes('@')) return phone
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) digits = `593${digits.slice(1)}`
  return `${digits}@s.whatsapp.net`
}

async function resolveWhatsAppJid(contact: WorkflowContact) {
  if (contact.phone) return getWhatsAppJid(contact.phone)

  const message = await prisma.whatsAppMessage.findFirst({
    where: {
      contactId: contact.id,
      NOT: { remoteJid: { endsWith: '@g.us' } },
    },
    orderBy: { timestamp: 'desc' },
    select: { remoteJid: true, phoneJid: true },
  })

  return message?.phoneJid || message?.remoteJid || null
}

function stepDelayMinutes(step: WorkflowStepWithTemplate) {
  return Math.max(0,
    (step.delayDays || 0) * 24 * 60 +
    (step.delayHours || 0) * 60 +
    (step.delayMinutes || 0)
  )
}

function workflowSteps(workflow: WorkflowWithSteps): WorkflowStepWithTemplate[] {
  if (workflow.steps?.length) {
    return workflow.steps
      .filter(step => step.template?.body)
      .slice()
      .sort((a, b) => a.order - b.order)
  }

  if (!workflow.template?.body) return []
  return [{
    order: 1,
    delayDays: workflow.delayDays || 0,
    delayHours: workflow.delayHours || 0,
    delayMinutes: workflow.delayMinutes || 0,
    templateId: workflow.templateId || null,
    template: workflow.template,
  }]
}

function runKey(workflow: WorkflowWithSteps, dealId: string | null | undefined, contactId: string, fromStageId: string | null | undefined, toStageId: string | null | undefined, enteredAt: Date) {
  return [
    workflow.id || 'adhoc',
    dealId || 'no-deal',
    contactId,
    fromStageId || 'none',
    toStageId || workflow.funnelStageId || workflow.stage || 'none',
    enteredAt.getTime(),
  ].join(':')
}

export async function findDealStageWorkflows(target: DealStageWorkflowTarget): Promise<WorkflowWithSteps[]> {
  const stage = target.stage || null
  const include = {
    template: true,
    steps: { include: { template: true }, orderBy: { order: 'asc' as const } },
  }

  if (target.funnelStageId && target.funnelId) {
    const workflows = await prisma.workflow.findMany({
      where: {
        active: true,
        trigger: 'DEAL_STAGE_CHANGED',
        OR: [
          { funnelId: target.funnelId, funnelStageId: target.funnelStageId },
          { funnelId: target.funnelId, funnelStageId: null, stage: stage as never },
        ],
      },
      include,
    })
    return workflows as WorkflowWithSteps[]
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      active: true,
      trigger: 'DEAL_STAGE_CHANGED',
      stage: stage as never,
      funnelId: null,
      funnelStageId: null,
    },
    include,
  })
  return workflows as WorkflowWithSteps[]
}

async function markRunProgress(workflowRunId: string | null | undefined) {
  if (!workflowRunId) return
  const pending = await prisma.scheduledMessage.count({
    where: {
      workflowRunId,
      status: { in: ['PENDING', 'PROCESSING'] as never },
      sent: false,
    },
  })
  if (pending === 0) {
    await prisma.workflowRun.updateMany({
      where: { id: workflowRunId, status: 'ACTIVE' as never },
      data: { status: 'COMPLETED' as never, completedAt: new Date() },
    })
  }
}

export async function cancelActiveWorkflowRunsForDeal(dealId: string, reason = 'Cambio de etapa') {
  const now = new Date()
  const runs = await prisma.workflowRun.findMany({
    where: { dealId, status: 'ACTIVE' as never },
    select: { id: true },
  })
  const ids = runs.map(run => run.id)
  if (ids.length === 0) return { cancelledRuns: 0, cancelledMessages: 0 }

  const [messages, runUpdate] = await prisma.$transaction([
    prisma.scheduledMessage.updateMany({
      where: {
        workflowRunId: { in: ids },
        sent: false,
        status: { in: ['PENDING', 'PROCESSING'] as never },
      },
      data: {
        status: 'CANCELLED' as never,
        sent: true,
        processingAt: null,
        cancelledAt: now,
        lastError: reason,
      },
    }),
    prisma.workflowRun.updateMany({
      where: { id: { in: ids }, status: 'ACTIVE' as never },
      data: { status: 'CANCELLED' as never, cancelledAt: now, lastError: reason },
    }),
  ])

  return { cancelledRuns: runUpdate.count, cancelledMessages: messages.count }
}

async function createWorkflowRunMessages(
  workflow: WorkflowWithSteps,
  contact: WorkflowContact,
  context: WorkflowContext,
  fromStageId?: string | null,
  toStageId?: string | null,
  enteredAt = new Date()
) {
  if (!workflow.id) return { skipped: 'missing_workflow' }

  const steps = workflowSteps(workflow)
  if (steps.length === 0) return { skipped: 'missing_steps_or_template' }

  const jid = await resolveWhatsAppJid(contact)
  if (!jid) return { skipped: 'missing_whatsapp_recipient' }
  const run = await prisma.workflowRun.create({
    data: {
      key: runKey(workflow, context.dealId, contact.id, fromStageId, toStageId, enteredAt),
      workflowId: workflow.id,
      contactId: contact.id,
      dealId: context.dealId || null,
      funnelStageId: toStageId || workflow.funnelStageId || null,
      status: 'ACTIVE' as never,
    },
  })

  const messages = []
  for (const step of steps) {
    const text = await renderWorkflowMessageWithAI(step.template!.body, contact, workflow)
    const sendAt = new Date(Date.now() + stepDelayMinutes(step) * 60 * 1000)
    messages.push({
      remoteJid: jid,
      body: text,
      contactId: contact.id,
      mediaUrl: step.template!.mediaUrl || null,
      mediaType: step.template!.mediaType || null,
      mediaName: step.template!.mediaName || null,
      sendAt,
      status: 'PENDING' as never,
      workflowRunId: run.id,
      workflowStepId: step.id || null,
    })
  }

  await prisma.scheduledMessage.createMany({ data: messages })
  ensureScheduledMessageRunner()
  return { scheduled: messages.length, runId: run.id }
}

export async function startDealStageWorkflows(deal: DealForWorkflow, previousFunnelStageId?: string | null) {
  if (!deal.contact) return { skipped: 'missing_contact' }
  if (!deal.funnelStageId && !deal.stage) return { skipped: 'missing_stage' }

  await cancelActiveWorkflowRunsForDeal(deal.id)

  const workflows = await findDealStageWorkflows({
    funnelStageId: deal.funnelStageId,
    funnelId: deal.funnelId,
    stage: deal.stage,
  })

  const results = []
  const seen = new Set<string>()
  const enteredAt = deal.updatedAt || new Date()
  for (const workflow of workflows) {
    const key = workflow.id || [workflow.name, workflow.funnelId, workflow.funnelStageId, workflow.stage].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    try {
      results.push(await createWorkflowRunMessages(
        workflow,
        deal.contact,
        { dealId: deal.id, stage: deal.funnelStage?.name || deal.stage },
        previousFunnelStageId,
        deal.funnelStageId,
        enteredAt
      ))
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        results.push({ skipped: 'already_started' })
      } else {
        console.error('[Workflow] start failed', workflow.id, error)
        results.push({ error: workflow.id })
      }
    }
  }

  return { workflows: workflows.length, results }
}

export async function queueOrSendWorkflowMessage(
  workflow: WorkflowWithSteps,
  contact: WorkflowContact,
  context: WorkflowContext = {}
) {
  return createWorkflowRunMessages(
    workflow,
    contact,
    context,
    null,
    workflow.funnelStageId || workflow.stage || null,
    new Date()
  )
}

export async function queueOrSendDealStageWorkflow(workflow: WorkflowWithSteps, contact: WorkflowContact, dealId: string, stage: string) {
  return queueOrSendWorkflowMessage(workflow, contact, { dealId, stage })
}

export async function runContactCreatedWorkflows(contact: WorkflowContact) {
  const workflows = await prisma.workflow.findMany({
    where: { active: true, trigger: 'CONTACT_CREATED' },
    include: {
      template: true,
      steps: { include: { template: true }, orderBy: { order: 'asc' } },
    },
  })

  for (const workflow of workflows) {
    await queueOrSendWorkflowMessage(workflow as WorkflowWithSteps, contact).catch(error => {
      console.error('[Workflow] contact-created send failed', error)
    })
  }
}

export async function runDueScheduledMessages() {
  const due = await prisma.scheduledMessage.findMany({
    where: {
      sent: false,
      processingAt: null,
      sendAt: { lte: new Date() },
      status: 'PENDING' as never,
    },
    orderBy: { sendAt: 'asc' },
    take: 25,
  })

  let sent = 0
  const errors: string[] = []
  const failed: string[] = []

  for (const message of due) {
    const claimed = await prisma.scheduledMessage.updateMany({
      where: {
        id: message.id,
        sent: false,
        processingAt: null,
        status: 'PENDING' as never,
      },
      data: {
        status: 'PROCESSING' as never,
        processingAt: new Date(),
        attempts: { increment: 1 },
      },
    })
    if (claimed.count === 0) continue

    try {
      const sentResult = message.mediaUrl
        ? await sendWAMediaMessageWithResult(message.remoteJid, message.body, message.mediaUrl, message.mediaType, message.mediaName)
        : await sendWAMessageWithResult(message.remoteJid, message.body)

      await prisma.whatsAppMessage.upsert({
        where: { messageId: sentResult.messageId },
        update: {
          remoteJid: sentResult.jid,
          fromMe: true,
          content: message.body,
          timestamp: new Date(),
          contactId: message.contactId,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
        },
        create: {
          remoteJid: sentResult.jid,
          fromMe: true,
          content: message.body,
          messageId: sentResult.messageId,
          timestamp: new Date(),
          contactId: message.contactId,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
        },
      })
      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT' as never,
          sent: true,
          sentAt: new Date(),
          processingAt: null,
          lastError: null,
        },
      })
      await markRunProgress(message.workflowRunId)
      sent += 1
    } catch (error) {
      const lastError = error instanceof Error ? error.message : 'Error enviando mensaje'
      const nextStatus = message.attempts + 1 >= 10 ? 'FAILED' : 'PENDING'
      if (nextStatus === 'FAILED') failed.push(message.id)
      else errors.push(message.id)

      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: {
          status: nextStatus as never,
          processingAt: null,
          lastError,
        },
      }).catch(() => {})
      if (nextStatus === 'FAILED' && message.workflowRunId) {
        await prisma.workflowRun.updateMany({
          where: { id: message.workflowRunId, status: 'ACTIVE' as never },
          data: { status: 'FAILED' as never, lastError },
        }).catch(() => {})
      }
      console.error('[ScheduledMessage] send failed', message.id, error)
    }
  }

  return { checked: due.length, sent, errors, failed }
}

export function ensureScheduledMessageRunner() {
  if (global.__scheduledMessageRunnerStarted) return
  global.__scheduledMessageRunnerStarted = true

  const tick = async () => {
    if (global.__scheduledMessageRunnerBusy) return
    global.__scheduledMessageRunnerBusy = true
    try {
      await runDueScheduledMessages()
    } catch (error) {
      console.error('[ScheduledMessage] runner failed', error)
    } finally {
      global.__scheduledMessageRunnerBusy = false
    }
  }

  tick().catch(() => {})
  setInterval(tick, 60000)
}
