import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import DashboardShell from '@/components/DashboardShell'
import { ensureWhatsAppSupervisor } from '@/lib/whatsapp'
import { ensureScheduledMessageRunner } from '@/lib/workflows'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  ensureWhatsAppSupervisor()
  ensureScheduledMessageRunner()

  return <DashboardShell user={session.user}>{children}</DashboardShell>
}
