import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { sendWAMediaMessage, sendWAMessage } from './whatsapp'
import { generateCRMWhatsAppMessage } from './openai'
import { serviceMatches } from './service-tags'
import path from 'path'

type WorkflowWithTemplate = {
  id?: string
  delayDays: number
  delayMinutes?: number | null
  trigger?: string
  stage?: string | null
  serviceTag?: string | null
  template: { body: string; mediaUrl?: string | null; mediaType?: string | null; mediaName?: string | null } | null
}

type WorkflowExecutionContext = {
  dealId?: string | null
  stage?: string | null
}

type WorkflowContact = {
  id: string
  name: string
  company: string | null
  phone: string | null
  tags?: string[]
  serviceLabel?: string | null
}

type WorkflowDeliveryResult =
  | { status: 'sent'; remoteJid: string }
  | { status: 'scheduled'; sendAt: Date }
  | { status: 'skipped'; reason: string }

declare global {
  // eslint-disable-next-line no-var
  var __scheduledMessageRunner: ReturnType<typeof setInterval> | undefined
  // eslint-disable-next-line no-var
  var __scheduledMessageRunnerBusy: boolean | undefined
}

function getWhatsAppJid(phoneOrJid: string) {
  if (phoneOrJid.includes('@')) return phoneOrJid
  const digits = phoneOrJid.replace(/\D/g, '')
  if (digits.startsWith('593')) return `${digits}@s.whatsapp.net`
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}@s.whatsapp.net`
  if (digits.startsWith('9') && digits.length === 9) return `593${digits}@s.whatsapp.net`
  return `${digits}@s.whatsapp.net`
}

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

export async function queueOrSendWorkflowMessage(
  workflow: WorkflowWithTemplate,
  contact: WorkflowContact,
  context?: WorkflowExecutionContext
) {
  if (!contact.phone) return { status: 'skipped', reason: 'contact_without_phone' } satisfies WorkflowDeliveryResult
  if (!workflow.template?.body) return { status: 'skipped', reason: 'workflow_without_template' } satisfies WorkflowDeliveryResult
  if (workflow.serviceTag && !workflowAppliesToContact(workflow.serviceTag, contact)) {
    return { status: 'skipped', reason: 'service_tag_does_not_match' } satisfies WorkflowDeliveryResult
  }

  const executionKey = getWorkflowExecutionKey(workflow, contact, context)
  if (executionKey) {
    const claimed = await claimWorkflowExecution(executionKey, workflow, contact, context)
    if (!claimed) return { status: 'skipped', reason: 'already_executed' } satisfies WorkflowDeliveryResult
  }

  const text = await renderWorkflowMessageWithAI(workflow.template.body, contact, workflow)
  const jid = getWhatsAppJid(contact.phone)

  const delayMinutes = (workflow.delayDays * 24 * 60) + (workflow.delayMinutes ?? 0)
  if (delayMinutes > 0) {
    const sendAt = new Date()
    sendAt.setMinutes(sendAt.getMinutes() + delayMinutes)
    await prisma.scheduledMessage.create({
      data: {
        remoteJid: jid,
        body: text,
        mediaUrl: workflow.template.mediaUrl,
        mediaType: workflow.template.mediaType,
        mediaName: workflow.template.mediaName,
        sendAt,
        contactId: contact.id,
      },
    })
    return { status: 'scheduled', sendAt } satisfies WorkflowDeliveryResult
  }

  const sentJid = workflow.template.mediaUrl && workflow.template.mediaType
    ? await sendWAMediaMessage({
      to: jid,
      filePath: path.join(process.cwd(), 'public', workflow.template.mediaUrl.replace(/^\//, '')),
      mimeType: workflow.template.mediaType,
      fileName: workflow.template.mediaName ?? 'adjunto',
      caption: text,
    })
    : await sendWAMessage(jid, text)
  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: sentJid,
      fromMe: true,
      content: text,
      messageId: `wf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      contactId: contact.id,
      mediaUrl: workflow.template.mediaUrl,
      mediaType: workflow.template.mediaType?.startsWith('image/') ? 'image'
        : workflow.template.mediaType?.startsWith('video/') ? 'video'
        : workflow.template.mediaType?.startsWith('audio/') ? 'audio'
        : workflow.template.mediaType ? 'document' : null,
    },
  })
  return { status: 'sent', remoteJid: sentJid } satisfies WorkflowDeliveryResult
}

export async function queueOrSendDealStageWorkflow(
  workflow: WorkflowWithTemplate,
  contact: WorkflowContact,
  context: WorkflowExecutionContext
) {
  return queueOrSendWorkflowMessage(
    {
      ...workflow,
      trigger: workflow.trigger ?? 'DEAL_STAGE_CHANGED',
      stage: context.stage ?? workflow.stage,
    },
    contact,
    context
  )
}

function getWorkflowExecutionKey(
  workflow: WorkflowWithTemplate,
  contact: WorkflowContact,
  context?: WorkflowExecutionContext
) {
  if (!workflow.id) return null
  const trigger = workflow.trigger ?? 'WORKFLOW'
  const stage = context?.stage ?? workflow.stage ?? 'none'
  const dealId = context?.dealId ?? 'none'
  return [trigger, workflow.id, contact.id, dealId, stage].join(':')
}

async function claimWorkflowExecution(
  key: string,
  workflow: WorkflowWithTemplate,
  contact: WorkflowContact,
  context?: WorkflowExecutionContext
) {
  try {
    await prisma.workflowExecution.create({
      data: {
        key,
        workflowId: workflow.id ?? 'unknown',
        contactId: contact.id,
        dealId: context?.dealId ?? null,
        stage: context?.stage ?? workflow.stage ?? null,
        status: 'STARTED',
      },
    })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false
    throw error
  }
}

export function workflowAppliesToContact(serviceTag: string | null | undefined, contact: WorkflowContact) {
  if (!serviceTag || serviceMatches('Todos', serviceTag) || serviceMatches('Todos los servicios', serviceTag)) return true
  const tags = contact.tags ?? []
  return tags.some(tag => serviceMatches(serviceTag, tag)) ||
    serviceMatches(serviceTag, contact.serviceLabel)
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

export async function runDueScheduledMessages() {
  await closeDuplicatePendingMessages()

  const due = await prisma.scheduledMessage.findMany({
    where: { sent: false, sendAt: { lte: new Date() } },
    orderBy: { sendAt: 'asc' },
    take: 25,
  })

  let sent = 0
  const errors: string[] = []

  for (const message of due) {
    try {
      const claimed = await prisma.scheduledMessage.updateMany({
        where: { id: message.id, sent: false, processingAt: null },
        data: { processingAt: new Date() },
      })
      if (claimed.count === 0) continue

      const jid = message.mediaUrl && message.mediaType
        ? await sendWAMediaMessage({
          to: message.remoteJid,
          filePath: path.join(process.cwd(), 'public', message.mediaUrl.replace(/^\//, '')),
          mimeType: message.mediaType,
          fileName: message.mediaName ?? 'adjunto',
          caption: message.body,
        })
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
          mediaType: message.mediaType?.startsWith('image/') ? 'image'
            : message.mediaType?.startsWith('video/') ? 'video'
            : message.mediaType?.startsWith('audio/') ? 'audio'
            : message.mediaType ? 'document' : null,
        },
      })
      await prisma.scheduledMessage.update({ where: { id: message.id }, data: { sent: true, processingAt: null } })
      sent += 1
    } catch (error) {
      await prisma.scheduledMessage.update({ where: { id: message.id }, data: { processingAt: null } }).catch(() => null)
      errors.push(message.id)
      console.error('[ScheduledMessage] send failed', message.id, error)
    }
  }

  return { checked: due.length, sent, errors }
}

async function closeDuplicatePendingMessages() {
  const pending = await prisma.scheduledMessage.findMany({
    where: { sent: false },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: { id: true, contactId: true, remoteJid: true, body: true, sendAt: true, mediaUrl: true, mediaType: true },
  })
  const seen = new Set<string>()
  const duplicateIds: string[] = []

  for (const message of pending) {
    const minuteBucket = Math.floor(message.sendAt.getTime() / 60_000)
    const key = [
      message.contactId ?? message.remoteJid,
      message.body,
      message.mediaUrl ?? '',
      message.mediaType ?? '',
      minuteBucket,
    ].join('|')
    if (seen.has(key)) duplicateIds.push(message.id)
    else seen.add(key)
  }

  if (duplicateIds.length > 0) {
    await prisma.scheduledMessage.updateMany({
      where: { id: { in: duplicateIds } },
      data: { sent: true, processingAt: null },
    })
    console.log('[ScheduledMessage] closed duplicate pending messages', duplicateIds.length)
  }
}

export function ensureScheduledMessageRunner() {
  if (globalThis.__scheduledMessageRunner) return

  const run = async () => {
    if (globalThis.__scheduledMessageRunnerBusy) return
    globalThis.__scheduledMessageRunnerBusy = true
    try {
      const result = await runDueScheduledMessages()
      if (result.checked > 0 || result.errors.length > 0) {
        console.log('[ScheduledMessage] runner', result)
      }
    } catch (error) {
      console.error('[ScheduledMessage] runner failed', error)
    } finally {
      globalThis.__scheduledMessageRunnerBusy = false
    }
  }

  globalThis.__scheduledMessageRunner = setInterval(run, 60_000)
  run().catch(error => console.error('[ScheduledMessage] initial runner failed', error))
}
