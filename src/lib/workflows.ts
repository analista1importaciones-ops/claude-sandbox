import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { sendWAMediaMessage, sendWAMessage } from './whatsapp'
import { generateCRMWhatsAppMessage } from './openai'
import { SERVICE_LABEL_TAGS, serviceMatches } from './service-tags'

type WorkflowTemplate = {
  body: string
  mediaUrl?: string | null
  mediaType?: string | null
  mediaName?: string | null
} | null

type WorkflowWithTemplate = {
  id?: string
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

async function renderWorkflowMessageWithAI(template: string, contact: WorkflowContact, workflow: WorkflowWithTemplate) {
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

function workflowDelayMinutes(workflow: WorkflowWithTemplate) {
  return Math.max(0,
    (workflow.delayDays || 0) * 24 * 60 +
    (workflow.delayHours || 0) * 60 +
    (workflow.delayMinutes || 0)
  )
}

function executionKey(workflow: WorkflowWithTemplate, contact: WorkflowContact, context: WorkflowContext) {
  const workflowId = workflow.id || 'adhoc'
  const trigger = workflow.trigger || 'UNKNOWN'
  const dealId = context.dealId || 'no-deal'
  const stage = context.stage || workflow.stage || 'no-stage'
  const funnel = workflow.funnelId || 'no-funnel'
  const funnelStage = workflow.funnelStageId || 'no-funnel-stage'
  return [trigger, workflowId, contact.id, dealId, stage, funnel, funnelStage].join(':')
}

async function claimWorkflowExecution(workflow: WorkflowWithTemplate, contact: WorkflowContact, context: WorkflowContext) {
  if (!workflow.id) return true
  try {
    await prisma.workflowExecution.create({
      data: {
        key: executionKey(workflow, contact, context),
        workflowId: workflow.id,
        contactId: contact.id,
        dealId: context.dealId || null,
        stage: context.stage || workflow.stage || null,
        status: 'QUEUED',
      },
    })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false
    }
    throw error
  }
}

function workflowAppliesToContact(serviceTag: string | null | undefined, contact: WorkflowContact) {
  if (!serviceTag) return true
  const serviceLabel = contact.serviceLabel ? SERVICE_LABEL_TAGS[contact.serviceLabel] || contact.serviceLabel : null
  return serviceMatches(serviceTag, [...(contact.tags ?? []), serviceLabel])
}

async function recordWorkflowStatus(workflow: WorkflowWithTemplate, contact: WorkflowContact, context: WorkflowContext, status: string) {
  if (!workflow.id) return
  await prisma.workflowExecution.updateMany({
    where: { key: executionKey(workflow, contact, context) },
    data: { status },
  }).catch(() => {})
}

export async function queueOrSendWorkflowMessage(
  workflow: WorkflowWithTemplate,
  contact: WorkflowContact,
  context: WorkflowContext = {}
) {
  if (!contact.phone || !workflow.template?.body) return { skipped: 'missing_phone_or_template' }
  if (!workflowAppliesToContact(workflow.serviceTag, contact)) return { skipped: 'service_mismatch' }

  const claimed = await claimWorkflowExecution(workflow, contact, context)
  if (!claimed) return { skipped: 'already_executed' }

  const text = await renderWorkflowMessageWithAI(workflow.template.body, contact, workflow)
  const jid = getWhatsAppJid(contact.phone)
  const delayMinutes = workflowDelayMinutes(workflow)
  const mediaUrl = workflow.template.mediaUrl || null
  const mediaType = workflow.template.mediaType || null
  const mediaName = workflow.template.mediaName || null

  if (delayMinutes > 0) {
    const sendAt = new Date(Date.now() + delayMinutes * 60 * 1000)
    await prisma.scheduledMessage.create({
      data: {
        remoteJid: jid,
        body: text,
        mediaUrl,
        mediaType,
        mediaName,
        sendAt,
        contactId: contact.id,
      },
    })
    await recordWorkflowStatus(workflow, contact, context, 'SCHEDULED')
    return { scheduled: true, sendAt }
  }

  const sentJid = mediaUrl
    ? await sendWAMediaMessage(jid, text, mediaUrl, mediaType, mediaName)
    : await sendWAMessage(jid, text)

  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: sentJid,
      fromMe: true,
      content: text,
      messageId: `wf_${workflow.id || 'adhoc'}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      contactId: contact.id,
      mediaUrl,
      mediaType,
    },
  })
  await recordWorkflowStatus(workflow, contact, context, 'SENT')
  return { sent: true }
}

export async function queueOrSendDealStageWorkflow(workflow: WorkflowWithTemplate, contact: WorkflowContact, dealId: string, stage: string) {
  return queueOrSendWorkflowMessage(workflow, contact, { dealId, stage })
}

export async function findDealStageWorkflows(target: DealStageWorkflowTarget): Promise<WorkflowWithTemplate[]> {
  const stage = target.stage || null
  if (target.funnelStageId && target.funnelId) {
    const workflows = await prisma.workflow.findMany({
      where: {
        active: true,
        trigger: 'DEAL_STAGE_CHANGED',
        OR: [
          { funnelStageId: target.funnelStageId },
          { funnelId: target.funnelId, funnelStageId: null },
        ],
      },
      include: { template: true },
    })
    return workflows as WorkflowWithTemplate[]
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      active: true,
      trigger: 'DEAL_STAGE_CHANGED',
      stage: stage as never,
      funnelId: null,
      funnelStageId: null,
    },
    include: { template: true },
  })
  return workflows as WorkflowWithTemplate[]
}

export async function runContactCreatedWorkflows(contact: WorkflowContact) {
  const workflows = await prisma.workflow.findMany({
    where: { active: true, trigger: 'CONTACT_CREATED' },
    include: { template: true },
  })

  for (const workflow of workflows) {
    await queueOrSendWorkflowMessage(workflow, contact).catch(error => {
      console.error('[Workflow] contact-created send failed', error)
    })
  }
}

async function closeDuplicatePendingMessages() {
  const pending = await prisma.scheduledMessage.findMany({
    where: { sent: false },
    select: { id: true, remoteJid: true, body: true, contactId: true, sendAt: true, mediaUrl: true },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })
  const seen = new Set<string>()
  for (const message of pending) {
    const key = [message.remoteJid, message.contactId || '', message.body, message.mediaUrl || '', message.sendAt.getTime()].join('|')
    if (!seen.has(key)) {
      seen.add(key)
      continue
    }
    await prisma.scheduledMessage.update({ where: { id: message.id }, data: { sent: true, processingAt: null } }).catch(() => {})
  }
}

export async function runDueScheduledMessages() {
  await closeDuplicatePendingMessages()
  const due = await prisma.scheduledMessage.findMany({
    where: { sent: false, processingAt: null, sendAt: { lte: new Date() } },
    orderBy: { sendAt: 'asc' },
    take: 25,
  })

  let sent = 0
  const errors: string[] = []

  for (const message of due) {
    const claimed = await prisma.scheduledMessage.updateMany({
      where: { id: message.id, sent: false, processingAt: null },
      data: { processingAt: new Date() },
    })
    if (claimed.count === 0) continue

    try {
      const jid = message.mediaUrl
        ? await sendWAMediaMessage(message.remoteJid, message.body, message.mediaUrl, message.mediaType, message.mediaName)
        : await sendWAMessage(message.remoteJid, message.body)

      await prisma.whatsAppMessage.create({
        data: {
          remoteJid: jid,
          fromMe: true,
          content: message.body,
          messageId: `sched_${message.id}_${Date.now()}`,
          timestamp: new Date(),
          contactId: message.contactId,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
        },
      })
      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: { sent: true, processingAt: null },
      })
      sent += 1
    } catch (error) {
      errors.push(message.id)
      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: { processingAt: null },
      }).catch(() => {})
      console.error('[ScheduledMessage] send failed', message.id, error)
    }
  }

  return { checked: due.length, sent, errors }
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
