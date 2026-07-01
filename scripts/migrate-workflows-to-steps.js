const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

function parseSequenceName(name) {
  const match = name.match(/^(.*) · Paso (\d+)$/)
  if (!match) return null
  return { base: match[1].trim(), order: Number(match[2]) }
}

async function main() {
  const backupDir = '/private/tmp'
  const backupPath = path.join(backupDir, `gtl-workflow-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const [workflows, scheduledMessages, executions] = await Promise.all([
    prisma.workflow.findMany({ include: { steps: true } }),
    prisma.scheduledMessage.findMany({ where: { sent: false } }),
    prisma.workflowExecution.findMany(),
  ])

  fs.writeFileSync(backupPath, JSON.stringify({ workflows, scheduledMessages, executions }, null, 2))

  let createdSteps = 0
  let deletedWorkflowSteps = 0
  const groups = new Map()

  for (const workflow of workflows) {
    const parsed = parseSequenceName(workflow.name)
    if (!parsed) continue
    const key = [
      parsed.base,
      workflow.trigger,
      workflow.funnelId || '',
      workflow.funnelStageId || '',
      workflow.stage || '',
      workflow.serviceTag || '',
    ].join('|')
    groups.set(key, [...(groups.get(key) || []), { workflow, parsed }])
  }

  for (const entries of groups.values()) {
    entries.sort((a, b) => a.parsed.order - b.parsed.order)
    const parent = entries[0].workflow
    const existing = await prisma.workflowStep.count({ where: { workflowId: parent.id } })
    if (existing === 0) {
      for (const entry of entries) {
        await prisma.workflowStep.create({
          data: {
            workflowId: parent.id,
            order: entry.parsed.order,
            delayDays: entry.workflow.delayDays,
            delayHours: entry.workflow.delayHours,
            delayMinutes: entry.workflow.delayMinutes,
            templateId: entry.workflow.templateId,
          },
        })
        createdSteps += 1
      }
    }
    await prisma.workflow.update({
      where: { id: parent.id },
      data: {
        name: entries[0].parsed.base,
        delayDays: parent.delayDays,
        delayHours: parent.delayHours,
        delayMinutes: parent.delayMinutes,
        templateId: parent.templateId,
      },
    })

    const extraIds = entries.slice(1).map(entry => entry.workflow.id)
    if (extraIds.length > 0) {
      const deleted = await prisma.workflow.deleteMany({ where: { id: { in: extraIds } } })
      deletedWorkflowSteps += deleted.count
    }
  }

  for (const workflow of workflows) {
    if (parseSequenceName(workflow.name)) continue
    const existing = await prisma.workflowStep.count({ where: { workflowId: workflow.id } })
    if (existing > 0 || !workflow.templateId) continue
    await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        order: 1,
        delayDays: workflow.delayDays,
        delayHours: workflow.delayHours,
        delayMinutes: workflow.delayMinutes,
        templateId: workflow.templateId,
      },
    })
    createdSteps += 1
  }

  const now = new Date()
  const cancelledMessages = await prisma.scheduledMessage.updateMany({
    where: { sent: false },
    data: {
      sent: true,
      status: 'CANCELLED',
      processingAt: null,
      cancelledAt: now,
      lastError: 'Cancelado durante migracion al motor de secuencias.',
    },
  })

  const cancelledExecutions = await prisma.workflowExecution.updateMany({
    where: { status: { in: ['STARTED', 'QUEUED', 'SCHEDULED'] } },
    data: { status: 'CANCELLED' },
  })

  console.log(JSON.stringify({
    backupPath,
    createdSteps,
    deletedWorkflowSteps,
    cancelledMessages: cancelledMessages.count,
    cancelledExecutions: cancelledExecutions.count,
  }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
