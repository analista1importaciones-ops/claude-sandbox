'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PAYMENT_ACCOUNTS, PAYMENT_RECEIPT_EMAIL } from '@/lib/paymentAccounts'

type InvoiceItem = {
  description: string
  quantity: string
  unitPrice: string
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

type ServiceInvoiceResponse = {
  number: string
  contactId: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerTaxId: string | null
  customerAddress: string | null
  serviceTag: string | null
  dueDate: string | null
  notes: string | null
  items: Array<{ description: string; quantity: number; unitPrice: number; appliesIva: boolean }>
}

const IVA_RATE = 0.15

export default function EditServiceInvoicePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [creatingContact, setCreatingContact] = useState(false)
  const [number, setNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerTaxId, setCustomerTaxId] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [serviceTag, setServiceTag] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [contactId, setContactId] = useState('')

  useEffect(() => {
    fetch('/api/contacts?limit=200')
      .then(res => res.json())
      .then(data => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))

    fetch(`/api/service-invoices/${params.id}`)
      .then(res => res.json())
      .then((invoice: ServiceInvoiceResponse) => {
        setNumber(invoice.number)
        setContactId(invoice.contactId ?? '')
        setCustomerName(invoice.customerName)
        setCustomerEmail(invoice.customerEmail ?? '')
        setCustomerPhone(invoice.customerPhone ?? '')
        setCustomerTaxId(invoice.customerTaxId ?? '')
        setCustomerAddress(invoice.customerAddress ?? '')
        setServiceTag(invoice.serviceTag ?? '')
        setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '')
        setNotes(invoice.notes ?? '')
        setItems((invoice.items ?? []).map(item => ({
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          appliesIva: item.appliesIva,
        })))
        setLoading(false)
      })
      .catch(() => {
        setError('No se pudo cargar la factura.')
        setLoading(false)
      })
  }, [params.id])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    const iva = items.reduce((sum, item) => sum + (item.appliesIva ? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * IVA_RATE : 0), 0)
    return { subtotal, iva, total: subtotal + iva }
  }, [items])

  function updateItem(index: number, data: Partial<InvoiceItem>) {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...data } : item))
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
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/service-invoices/${params.id}`, {
        method: 'PATCH',
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
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar la factura')
      router.push('/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la factura')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gtl-navy'

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando factura...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Facturas</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Editar factura {number}</h1>
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
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Servicios a facturar</h2>
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
              <input value={serviceTag} onChange={e => setServiceTag(e.target.value)} className={inputClass} placeholder="Servicio general" />
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
          <button onClick={submit} disabled={saving || !customerName || totals.total <= 0} className="mt-5 w-full bg-gtl-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gtl-navy-dark disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <a href={`/api/service-invoices/${params.id}/pdf`} target="_blank" className="mt-2 flex justify-center w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">
            Ver PDF
          </a>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Datos para el pago</h3>
            <div className="space-y-3">
              {PAYMENT_ACCOUNTS.map(account => (
                <div key={account.accountNumber} className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <div className="text-xs font-bold text-gtl-navy">{account.bank}</div>
                  <div className="text-xs text-gray-600 mt-1">{account.accountType}</div>
                  <div className="text-sm font-mono font-semibold text-gray-900 mt-1">{account.accountNumber}</div>
                  <div className="text-xs text-gray-500 mt-1">{account.beneficiary}</div>
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
