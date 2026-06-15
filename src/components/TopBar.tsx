'use client'

import { signOut } from 'next-auth/react'

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function TopBar({ user }: TopBarProps) {
  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{user?.name ?? 'Usuario'}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gtl-navy flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initial}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
