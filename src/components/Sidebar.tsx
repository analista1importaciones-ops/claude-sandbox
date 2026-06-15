'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: '🏠',
  },
  {
    href: '/rates',
    label: 'Tarifas',
    icon: '🗂️',
  },
  {
    href: '/quotations',
    label: 'Cotizaciones',
    icon: '📄',
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: '⚙️',
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={`bg-gtl-navy flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gtl-navy-light">
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-wide">GTL</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white opacity-70 hover:opacity-100 transition-opacity p-1 rounded"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-gtl-navy-light">
          <p className="text-white/40 text-xs text-center">GTL Rate Manager v0.1</p>
        </div>
      )}
    </div>
  )
}
