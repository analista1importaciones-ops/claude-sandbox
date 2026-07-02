'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface NotificationItem { id: string; type: string; title: string; detail: string; at: string; href: string; urgent: boolean }

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  onMenu?: () => void
}

export default function TopBar({ user, onMenu }: TopBarProps) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [urgent, setUrgent] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = () => fetch('/api/notifications').then(res => res.ok ? res.json() : null).then(data => {
      if (data) { setItems(data.items || []); setUrgent(data.urgent || 0) }
    }).catch(() => {})
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

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
        <div className="relative">
          <button onClick={() => setOpen(value => !value)} className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100" title="Notificaciones" aria-label="Notificaciones">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0" /></svg>
            {urgent > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold text-white">{urgent > 9 ? '9+' : urgent}</span>}
          </button>
          {open && (
            <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-11 sm:w-96">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><span className="font-semibold text-gray-800">Pendientes</span><Link href="/appointments" onClick={() => setOpen(false)} className="text-xs text-blue-600">Ver citas</Link></div>
              {items.length === 0 ? <p className="p-5 text-center text-sm text-gray-400">No hay pendientes próximos.</p> : items.map(item => (
                <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.urgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{item.type}</span><span className="truncate text-sm font-medium text-gray-800">{item.title}</span></div>
                  <p className="mt-1 truncate text-xs text-gray-500">{item.detail}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{new Date(item.at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guayaquil' })}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
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
