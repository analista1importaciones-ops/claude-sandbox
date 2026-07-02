'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PAYMENT_ACCOUNTS, PAYMENT_RECEIPT_EMAIL } from '@/lib/paymentAccounts'

type CatalogEntry = {
  key: string
  label: string
  value: number | string
  appliesIva: boolean
}

type ContactOption = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  serviceLabel: string
}

type InvoiceItem = {
  description: string
  quantity: string
  unitPrice: string
  appliesIva: boolean
}

const IVA_RATE = 0.15

export default function NewServiceInvoicePage() {
  const router = useRouter()
  const [serviceRates, setServiceRates] = useState<CatalogEntry[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactId, setContactId] = useState('')
  const [creatingContact, setCreatingContact] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerTaxId, setCustomerTaxId] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [serviceTag, setServiceTag] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: '1', unitPrice: '', appliesIva: true },
  ])

  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => setServiceRates(data.serviceRates ?? []))
      .catch(() => setServiceRates([]))

    fetch('/api/contacts?limit=200')
      .then(res => res.json())
      .then(data => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
  }, [])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    const iva = items.reduce((sum, item) => sum + (item.appliesIva ? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * IVA_RATE : 0), 0)
    return { subtotal, iva, total: subtotal + iva }
  }, [items])

  function updateItem(index: number, data: Partial<InvoiceItem>) {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...data } : item))
  }

  function addItemFromCatalog(key: string) {
    const entry = serviceRates.find(service => service.key === key)
    if (!entry) return
    setServiceTag(entry.label)
    setItems(current => {
      const emptyIndex = current.findIndex(item => !item.description && !item.unitPrice)
      const nextItem = {
        description: entry.label,
        quantity: '1',
        unitPrice: String(entry.value ?? 0),
        appliesIva: entry.appliesIva,
      }
      if (emptyIndex >= 0) {
        return current.map((item, index) => index === emptyIndex ? nextItem : item)
      }
      return [...current, nextItem]
    })
  }

  function applyContact(id: string) {
    setContactId(id)
    const contact = contacts.find(item => item.id === id)
    if (!contact) return
    setCustomerName(contact.name)
    setCustomerEmail(contact.email ?? '')
    setCustomerPhone(contact.phone ?? '')
    if (!serviceTag && contact.serviceLabel && contact.serviceLabel !== 'OTRO') setServiceTag(contact.serviceLabel)
  }

  async function createContactFromInvoice() {
    if (!customerName.trim()) {
      setError('Escribe el nombre del cliente antes de crearlo en GTL OS.')
      return
    }
    setCreatingContact(true)
    setError('')
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName,
          email: customerEmail || null,
          phone: customerPhone || null,
          company: null,
          tags: ['Factura'],
          serviceLabel: 'OTRO',
          source: 'OTRO',
        }),
      })
      const contact = await res.json()
      if (!res.ok) throw new Error(contact.error ?? 'No se pudo crear el cliente')
      setContacts(current => [contact, ...current])
      setContactId(contact.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente')
    } finally {
      setCreatingContact(false)
    }
  }

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/service-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          contactId,
          customerEmail,
          customerPhone,
          customerTaxId,
          customerAddress,
          serviceTag,
          dueDate,
          notes,
          currency: 'USD',
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear la factura')
      router.push('/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la factura')
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Facturas</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nueva factura de servicio</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Documento de cobro</p>
          <p className="text-sm text-gray-600 mt-1">Factura de servicios emitida por Global Trade Logistic y Auriga International.</p>
        </div>
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Global Trade Logistic" className="h-14 w-28 object-contain" />
          <img src="/auriga-logo.jpeg" alt="Auriga International" className="h-14 w-24 object-contain" />
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Cliente</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={contactId} onChange={e => applyContact(e.target.value)} className={`${inputClass} md:col-span-2`}>
                <option value="">Elegir cliente desde contactos...</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}{contact.company ? ` · ${contact.company}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
                  </option>
                ))}
              </select>
              {!contactId && (
                <button type="button" onClick={createContactFromInvoice} disabled={creatingContact || !customerName.trim()} className="md:col-span-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50">
                  {creatingContact ? 'Creando cliente...' : '+ Crear cliente en GTL OS con estos datos'}
                </button>
              )}
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputClass} placeholder="Nombre del cliente *" />
              <input value={customerTaxId} onChange={e => setCustomerTaxId(e.target.value)} className={inputClass} placeholder="RUC / Cédula" />
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} type="email" className={inputClass} placeholder="Email" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inputClass} placeholder="Teléfono / WhatsApp" />
              <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className={`${inputClass} md:col-span-2`} placeholder="Dirección" />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-sm font-semibold text-gray-700">Servicios a facturar</h2>
              <select onChange={e => { addItemFromCatalog(e.target.value); e.target.value = '' }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
                <option value="">Agregar desde catálogo...</option>
                {serviceRates.map(service => (
                  <option key={service.key} value={service.key}>{service.label} · ${Number(service.value).toFixed(2)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid md:grid-cols-[1fr_80px_120px_90px_auto] gap-2 items-center">
                  <input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} className={inputClass} placeholder="Descripción del servicio" />
                  <input value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} type="number" min="0" step="0.01" className={inputClass} placeholder="Cant." />
                  <input value={item.unitPrice} onChange={e => updateItem(index, { unitPrice: e.target.value })} type="number" min="0" step="0.01" className={inputClass} placeholder="Precio" />
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={item.appliesIva} onChange={e => updateItem(index, { appliesIva: e.target.checked })} />
                    IVA
                  </label>
                  <button onClick={() => setItems(current => current.filter((_, i) => i !== index))} disabled={items.length === 1} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setItems(current => [...current, { description: '', quantity: '1', unitPrice: '', appliesIva: true }])} className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              + Agregar línea
            </button>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos de cobro</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={serviceTag} onChange={e => setServiceTag(e.target.value)} className={inputClass} placeholder="Servicio general: Cursos, Asesorías..." />
              <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className={inputClass} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${inputClass} md:col-span-2`} placeholder="Notas o condiciones de pago" />
            </div>
          </section>
        </div>

        <aside className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-mono">${totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IVA</span><span className="font-mono">${totals.iva.toFixed(2)}</span></div>
            <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gtl-navy"><span>Total</span><span className="font-mono">${totals.total.toFixed(2)}</span></div>
          </div>
          <button onClick={submit} disabled={loading || !customerName || totals.total <= 0} className="mt-5 w-full bg-gtl-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gtl-navy-dark disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear factura'}
          </button>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Datos para el pago</h3>
            <div className="space-y-3">
              {PAYMENT_ACCOUNTS.map(account => (
                <div key={account.accountNumber} className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <div className="text-xs font-bold text-gtl-navy">{account.bank}</div>
                  <div className="text-xs text-gray-600 mt-1">{account.accountType}</div>
                  <div className="text-sm font-mono font-semibold text-gray-900 mt-1">{account.accountNumber}</div>
                  <div className="text-xs text-gray-500 mt-1">{account.beneficiary}</div>
                  {account.taxId && <div className="text-xs text-gray-500">RUC {account.taxId}</div>}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-orange-50 border border-orange-100 p-3 text-xs text-orange-700">
              Enviar comprobante a:<br />
              <span className="font-semibold">{PAYMENT_RECEIPT_EMAIL}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
