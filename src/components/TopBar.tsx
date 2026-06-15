'use client'

import { signOut } from 'next-auth/react'

interface TopBarProps {
  user: { name?: string | null; email?: string | null }
}

export default function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-800">{user.name}</div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md border border-gray-200 hover:border-red-200"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
