const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "WorkflowRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "ScheduledMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  `CREATE TABLE IF NOT EXISTS "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "funnelStageId" TEXT,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
  );`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "status" "ScheduledMessageStatus" NOT NULL DEFAULT 'PENDING';`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "lastError" TEXT;`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "workflowRunId" TEXT;`,
  `ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "workflowStepId" TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStep_workflowId_order_key" ON "WorkflowStep"("workflowId", "order");`,
  `CREATE INDEX IF NOT EXISTS "WorkflowStep_templateId_idx" ON "WorkflowStep"("templateId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowRun_key_key" ON "WorkflowRun"("key");`,
  `CREATE INDEX IF NOT EXISTS "WorkflowRun_workflowId_status_idx" ON "WorkflowRun"("workflowId", "status");`,
  `CREATE INDEX IF NOT EXISTS "WorkflowRun_contactId_status_idx" ON "WorkflowRun"("contactId", "status");`,
  `CREATE INDEX IF NOT EXISTS "WorkflowRun_dealId_status_idx" ON "WorkflowRun"("dealId", "status");`,
  `CREATE INDEX IF NOT EXISTS "Workflow_active_trigger_funnelId_funnelStageId_idx" ON "Workflow"("active", "trigger", "funnelId", "funnelStageId");`,
  `CREATE INDEX IF NOT EXISTS "ScheduledMessage_status_sendAt_idx" ON "ScheduledMessage"("status", "sendAt");`,
  `CREATE INDEX IF NOT EXISTS "ScheduledMessage_workflowRunId_idx" ON "ScheduledMessage"("workflowRunId");`,
  `CREATE INDEX IF NOT EXISTS "ScheduledMessage_workflowStepId_idx" ON "ScheduledMessage"("workflowStepId");`,
]

const constraints = [
  {
    name: 'WorkflowStep_workflowId_fkey',
    sql: `ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
  },
  {
    name: 'WorkflowStep_templateId_fkey',
    sql: `ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
  },
  {
    name: 'WorkflowRun_workflowId_fkey',
    sql: `ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
  },
  {
    name: 'WorkflowRun_contactId_fkey',
    sql: `ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
  },
  {
    name: 'WorkflowRun_dealId_fkey',
    sql: `ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
  },
  {
    name: 'ScheduledMessage_workflowRunId_fkey',
    sql: `ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
  },
  {
    name: 'ScheduledMessage_workflowStepId_fkey',
    sql: `ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
  },
]

async function constraintExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_constraint WHERE conname = $1 LIMIT 1`,
    name
  )
  return rows.length > 0
}

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  for (const constraint of constraints) {
    if (!(await constraintExists(constraint.name))) {
      await prisma.$executeRawUnsafe(constraint.sql)
    }
  }

  console.log('Workflow schema applied')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
