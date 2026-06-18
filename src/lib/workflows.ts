import { prisma } from './prisma'
import { sendWAMessage } from './whatsapp'
import { generateCRMWhatsAppMessage } from './openai'

type WorkflowWithTemplate = {
  delayDays: number
  trigger?: string
  stage?: string | null
  serviceTag?: string | null
  template: { body: string } | null
}

type WorkflowContact = {
  id: string
  name: string
  company: string | null
  phone: string | null
  tags?: string[]
  serviceLabel?: string | null
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

export async function queueOrSendWorkflowMessage(workflow: WorkflowWithTemplate, contact: WorkflowContact) {
  if (!contact.phone || !workflow.template?.body) return
  if (workflow.serviceTag && !workflowAppliesToContact(workflow.serviceTag, contact)) return

  const text = await renderWorkflowMessageWithAI(workflow.template.body, contact, workflow)
  const jid = contact.phone.includes('@') ? contact.phone : `${contact.phone.replace(/\D/g, '')}@s.whatsapp.net`

  if (workflow.delayDays > 0) {
    const sendAt = new Date()
    sendAt.setDate(sendAt.getDate() + workflow.delayDays)
    await prisma.scheduledMessage.create({
      data: { remoteJid: jid, body: text, sendAt, contactId: contact.id },
    })
    return
  }

  const sentJid = await sendWAMessage(jid, text)
  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: sentJid,
      fromMe: true,
      content: text,
      messageId: `wf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      contactId: contact.id,
    },
  })
}

export function workflowAppliesToContact(serviceTag: string | null | undefined, contact: WorkflowContact) {
  if (!serviceTag) return true
  const normalized = normalizeServiceText(serviceTag)
  const tags = contact.tags ?? []
  return tags.some(tag => normalizeServiceText(tag) === normalized) ||
    normalizeServiceText(contact.serviceLabel) === normalized
}

function normalizeServiceText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
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
  const due = await prisma.scheduledMessage.findMany({
    where: { sent: false, sendAt: { lte: new Date() } },
    orderBy: { sendAt: 'asc' },
    take: 25,
  })

  let sent = 0
  const errors: string[] = []

  for (const message of due) {
    try {
      const jid = await sendWAMessage(message.remoteJid, message.body)
      await prisma.whatsAppMessage.create({
        data: {
          remoteJid: jid,
          fromMe: true,
          content: message.body,
          messageId: `sched_${message.id}_${Date.now()}`,
          timestamp: new Date(),
          contactId: message.contactId,
        },
      })
      await prisma.scheduledMessage.update({ where: { id: message.id }, data: { sent: true } })
      sent += 1
    } catch (error) {
      errors.push(message.id)
      console.error('[ScheduledMessage] send failed', message.id, error)
    }
  }

  return { checked: due.length, sent, errors }
}
