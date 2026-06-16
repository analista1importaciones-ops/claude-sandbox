'use client'

import { useState, useRef, useEffect } from 'react'
import { COMMON_PORTS } from '@/lib/rateStatus'

interface PortComboboxProps {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function PortCombobox({ name, value, onChange, placeholder = 'Ej: NINGBO', label, required }: PortComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.length === 0
    ? COMMON_PORTS
    : COMMON_PORTS.filter(p =>
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.country.toLowerCase().includes(query.toLowerCase())
      )

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type="text"
        name={name}
        value={query}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gtl-navy focus:border-transparent"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 italic">Escribir puerto libre: {query}</li>
          ) : (
            filtered.map(p => (
              <li
                key={p.code}
                onMouseDown={() => {
                  onChange(p.code)
                  setQuery(p.code)
                  setOpen(false)
                }}
                className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex justify-between"
              >
                <span className="font-medium">{p.code}</span>
                <span className="text-gray-400">{p.name}, {p.country}</span>
              </li>
            ))
          )}
          {query && !COMMON_PORTS.find(p => p.code === query.toUpperCase()) && (
            <li
              onMouseDown={() => {
                const upper = query.toUpperCase()
                onChange(upper)
                setQuery(upper)
                setOpen(false)
              }}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-blue-600 border-t border-gray-100"
            >
              Usar &quot;{query.toUpperCase()}&quot; como puerto libre
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
