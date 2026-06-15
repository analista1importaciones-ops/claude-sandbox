'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Panel de Control', icon: '◈' },
  { href: '/rates', label: 'Tarifas', icon: '📋' },
  { href: '/quotations', label: 'Cotizaciones', icon: '📄' },
  { href: '/settings', label: 'Configuración', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gtl-navy flex flex-col h-full shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gtl-navy-light">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gtl-orange rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">GTL</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Rate Manager</div>
            <div className="text-blue-300 text-xs">Global Trade Logistics</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-gtl-orange text-white'
                  : 'text-blue-200 hover:bg-gtl-navy-light hover:text-white'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gtl-navy-light">
        <p className="text-blue-400 text-xs">v1.0.0 — MVP Sprint 1</p>
      </div>
    </aside>
  )
}
