'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewContactPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'OTRO',
    serviceLabel: 'OTRO',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const contact = await res.json()
      router.push(`/crm/contacts/${contact.id}`)
    } else {
      setSaving(false)
      alert('Error al crear contacto')
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <Link href="/crm" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a Contactos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nuevo Contacto</h1>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
            <select
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            >
              <option value="PAUTA">Pauta</option>
              <option value="REFERIDO">Referido</option>
              <option value="WEB">Web</option>
              <option value="LLAMADA">Llamada entrante</option>
              <option value="FERIA">Feria</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio de interés</label>
            <select
              value={form.serviceLabel}
              onChange={(e) => set('serviceLabel', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gtl-orange"
            >
              <option value="COURIER">Courier</option>
              <option value="NACIONALIZACION">Nacionalización</option>
              <option value="TRANSPORTE_PESADO">Transporte Pesado</option>
              <option value="SEGURO_CARGA">Seguro de Carga</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-gtl-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear Contacto'}
          </button>
          <Link
            href="/crm"
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
