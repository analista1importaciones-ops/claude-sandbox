'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardShellProps {
  user?: { name?: string | null; email?: string | null }
  children: React.ReactNode
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh bg-gray-100 overflow-hidden">
      {menuOpen && <button className="fixed inset-0 z-30 bg-black/35 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </div>
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">{children}</main>
      </div>
    </div>
  )
}
