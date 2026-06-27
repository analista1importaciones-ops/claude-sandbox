'use client'

import { signOut } from 'next-auth/react'

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  onMenu?: () => void
}

export default function TopBar({ user, onMenu }: TopBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-md border border-gray-200 p-2 text-gray-600 md:hidden" aria-label="Abrir menú">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      <div className="truncate text-xs sm:text-sm text-gray-500">
        {new Date().toLocaleDateString('es-EC', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-800">{user?.name ?? 'Usuario'}</div>
          <div className="text-xs text-gray-500">{user?.email}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gtl-navy flex items-center justify-center text-white text-sm font-bold">
          {(user?.name ?? 'U').charAt(0).toUpperCase()}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-gray-500 hover:text-red-600 transition-colors text-sm"
          title="Cerrar sesión"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
