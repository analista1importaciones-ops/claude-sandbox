'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

interface Message { id: string; remoteJid: string; fromMe: boolean; content: string; timestamp: string; contactId: string | null }
interface Conversation { id: string; remoteJid: string; content: string; timestamp: string; fromMe: boolean; contact: { id: string; name: string } | null }
interface Contact { id: string; name: string; company: string | null; phone: string | null; email: string | null }
interface QuickReply { id: string; title: string; body: string }
interface InternalNote { id: string; content: string; createdAt: string }
interface ScheduledMsg { id: string; body: string; sendAt: string; sent: boolean }

export default function WhatsAppPage() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedJid, setSelectedJid] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'scheduled'>('chat')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [linkedContact, setLinkedContact] = useState<Contact | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQR, setShowQR] = useState(false)
  const [newQRTitle, setNewQRTitle] = useState('')
  const [newQRBody, setNewQRBody] = useState('')
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>([])
  const [showSchedModal, setShowSchedModal] = useState(false)
  const [schedBody, setSchedBody] = useState('')
  const [schedAt, setSchedAt] = useState('')
  const [showApptModal, setShowApptModal] = useState(false)
  const [apptTitle, setApptTitle] = useState('')
  const [apptDesc, setApptDesc] = useState('')
  const [apptStart, setApptStart] = useState('')
  const [apptEnd, setApptEnd] = useState('')
  const [apptNotify, setApptNotify] = useState(true)
  const [showQRPicker, setShowQRPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function pollStatus() {
    const res = await fetch('/api/whatsapp/status')
    const data = await res.json()
    setStatus(data.status)
    if (data.qrCode) { const url = await QRCode.toDataURL(data.qrCode); setQrUrl(url) }
    else setQrUrl(null)
  }
  async function loadConversations() {
    const res = await fetch('/api/whatsapp/conversations')
    if (res.ok) setConversations(await res.json())
  }
  async function loadMessages(jid: string) {
    const res = await fetch('/api/whatsapp/messages?jid=' + encodeURIComponent(jid))
    const data = await res.json()
    setMessages(data)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }
  async function loadContacts() {
    const res = await fetch('/api/contacts?limit=200')
    if (res.ok) { const d = await res.json(); setContacts(d.contacts ?? d) }
  }
  async function loadQuickReplies() {
    const res = await fetch('/api/quick-replies')
    if (res.ok) setQuickReplies(await res.json())
  }
  async function loadNotes(jid: string) {
    const res = await fetch('/api/whatsapp/notes?jid=' + encodeURIComponent(jid))
    if (res.ok) setNotes(await res.json())
  }
  async function loadScheduled(jid: string) {
    const res = await fetch('/api/scheduled-messages?jid=' + encodeURIComponent(jid))
    if (res.ok) setScheduled(await res.json())
  }
  async function sendReply() {
    if (!reply.trim() || !selectedJid) return
    setSending(true)
    await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: selectedJid, body: reply }) })
    setReply(''); setSending(false)
    loadMessages(selectedJid); loadConversations()
  }
  async function saveNote() {
    if (!newNote.trim() || !selectedJid) return
    await fetch('/api/whatsapp/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: selectedJid, content: newNote, contactId: linkedContact?.id }) })
    setNewNote(''); loadNotes(selectedJid)
  }
  async function createQR() {
    if (!newQRTitle.trim() || !newQRBody.trim()) return
    await fetch('/api/quick-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newQRTitle, body: newQRBody }) })
    setNewQRTitle(''); setNewQRBody(''); loadQuickReplies()
  }
  async function deleteQR(id: string) {
    await fetch('/api/quick-replies/' + id, { method: 'DELETE' }); loadQuickReplies()
  }
  async function scheduleMessage() {
    if (!schedBody.trim() || !schedAt || !selectedJid) return
    await fetch('/api/scheduled-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: selectedJid, body: schedBody, sendAt: new Date(schedAt).toISOString(), contactId: linkedContact?.id }) })
    setSchedBody(''); setSchedAt(''); setShowSchedModal(false); loadScheduled(selectedJid)
  }
  async function createAppointment() {
    if (!apptTitle.trim() || !apptStart || !apptEnd) return
    await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: apptTitle, description: apptDesc, startAt: new Date(apptStart).toISOString(), endAt: new Date(apptEnd).toISOString(), contactId: linkedContact?.id, remoteJid: apptNotify ? selectedJid : undefined }) })
    setApptTitle(''); setApptDesc(''); setApptStart(''); setApptEnd(''); setShowApptModal(false)
  }

  useEffect(() => {
    pollStatus(); loadConversations(); loadContacts(); loadQuickReplies()
    const si = setInterval(pollStatus, 5000)
    const sc = setInterval(loadConversations, 5000)
    return () => { clearInterval(si); clearInterval(sc) }
  }, [])

  useEffect(() => {
    if (selectedJid) {
      loadMessages(selectedJid); loadNotes(selectedJid); loadScheduled(selectedJid)
      const conv = conversations.find(c => c.remoteJid === selectedJid)
      setLinkedContact(conv?.contact ? { id: conv.contact.id, name: conv.contact.name, company: null, phone: null, email: null } : null)
      setActiveTab('chat')
      const iv = setInterval(() => loadMessages(selectedJid), 5000)
      return () => clearInterval(iv)
    }
  }, [selectedJid])

  const selectedConv = conversations.find(c => c.remoteJid === selectedJid)
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone ?? '').includes(contactSearch))

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">WhatsApp</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-500">{status === 'connected' ? 'Conectado' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}</span>
          </div>
          {status === 'disconnected' && (
            <button onClick={() => { fetch('/api/whatsapp/status', { method: 'POST' }); pollStatus() }} className="mt-2 w-full px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Conectar</button>
          )}
        </div>
        {qrUrl && <div className="p-4 flex flex-col items-center border-b border-gray-100"><p className="text-xs text-gray-500 mb-2">Escanea con WhatsApp</p><img src={qrUrl} alt="QR" className="w-48 h-48" /></div>}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0
            ? <p className="text-xs text-gray-400 text-center mt-8 px-4">{status === 'connected' ? 'Los chats apareceran aqui cuando recibas mensajes' : 'Conecta WhatsApp para ver los chats'}</p>
            : conversations.map(conv => (
              <button key={conv.remoteJid} onClick={() => setSelectedJid(conv.remoteJid)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedJid === conv.remoteJid ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 truncate">{conv.contact?.name ?? conv.remoteJid.replace('@s.whatsapp.net', '')}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{new Date(conv.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{conv.fromMe ? 'Tu: ' : ''}{conv.content}</p>
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {!selectedJid
          ? <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{status === 'connected' ? 'Selecciona una conversacion' : 'Conecta WhatsApp para ver los chats'}</div>
          : <>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{selectedConv?.contact?.name ?? selectedJid.replace('@s.whatsapp.net', '')}</p>
                <p className="text-xs text-gray-400">{selectedJid.replace('@s.whatsapp.net', '')}</p>
              </div>
              <div className="flex gap-2">
                {(['chat', 'notes', 'scheduled'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === tab ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {tab === 'chat' ? 'Chat' : tab === 'notes' ? 'Notas internas' : 'Programados'}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.fromMe ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        {m.content}
                        <div className={`text-xs mt-1 ${m.fromMe ? 'text-green-100' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-2 items-center">
                  <div className="relative">
                    <button onClick={() => setShowQRPicker(!showQRPicker)} className="p-2 text-gray-400 hover:text-yellow-500" title="Respuestas rapidas">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </button>
                    {showQRPicker && quickReplies.length > 0 && (
                      <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto z-10">
                        {quickReplies.map(qr => (
                          <button key={qr.id} onClick={() => { setReply(qr.body); setShowQRPicker(false) }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                            <p className="text-xs font-medium text-gray-700">{qr.title}</p>
                            <p className="text-xs text-gray-400 truncate">{qr.body}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="text" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Escribe un mensaje..." className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 py-2 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 disabled:opacity-50">Enviar</button>
                </div>
              </>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 gap-3">
                <div className="flex-1 overflow-y-auto space-y-2">
                  {notes.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No hay notas internas</p>}
                  {notes.map(n => (
                    <div key={n.id} className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-800">{n.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('es-GT')}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote()} placeholder="Nueva nota interna..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <button onClick={saveNote} disabled={!newNote.trim()} className="px-3 py-2 bg-yellow-400 text-white rounded-lg text-sm hover:bg-yellow-500 disabled:opacity-50">Guardar</button>
                </div>
              </div>
            )}

            {activeTab === 'scheduled' && (
              <div className="flex-1 flex flex-col p-4 gap-3">
                <div className="flex justify-end">
                  <button onClick={() => setShowSchedModal(true)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">+ Programar mensaje</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {scheduled.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No hay mensajes programados</p>}
                  {scheduled.map(s => (
                    <div key={s.id} className={`border rounded-lg px-3 py-2 ${s.sent ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className="text-sm text-gray-800">{s.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(s.sendAt).toLocaleString('es-GT')} {s.sent ? 'Enviado' : 'Pendiente'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
      </div>

      {selectedJid && (
        <div className="w-72 border-l border-gray-100 flex flex-col bg-white overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contacto CRM</p>
            {linkedContact
              ? <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-gray-800">{linkedContact.name}</p>
                  {linkedContact.company && <p className="text-xs text-gray-400">{linkedContact.company}</p>}
                  <button onClick={() => setLinkedContact(null)} className="text-xs text-red-400 hover:text-red-600 mt-1">Desvincular</button>
                </div>
              : <div>
                  <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Buscar contacto..." className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 mb-2" />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredContacts.slice(0, 10).map(c => (
                      <button key={c.id} onClick={() => { const found = contacts.find(x => x.id === c.id); setLinkedContact(found ?? null); setContactSearch('') }} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">{c.name}{c.company ? ' - ' + c.company : ''}</button>
                    ))}
                  </div>
                </div>
            }
          </div>
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acciones rapidas</p>
            <div className="space-y-2">
              <button onClick={() => setShowApptModal(true)} className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 hover:bg-purple-100 text-left">Agendar cita</button>
              <button onClick={() => setShowSchedModal(true)} className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 text-left">Programar mensaje</button>
              <button onClick={() => setActiveTab('notes')} className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 hover:bg-yellow-100 text-left">Nota interna</button>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Respuestas rapidas</p>
              <button onClick={() => setShowQR(!showQR)} className="text-xs text-blue-500 hover:text-blue-700">{showQR ? 'Cerrar' : '+ Nueva'}</button>
            </div>
            {showQR && (
              <div className="mb-3 space-y-2">
                <input type="text" value={newQRTitle} onChange={e => setNewQRTitle(e.target.value)} placeholder="Titulo" className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                <textarea value={newQRBody} onChange={e => setNewQRBody(e.target.value)} placeholder="Texto del mensaje" rows={3} className="w-full border border-gray-200 rounded px-2 py-1 text-xs resize-none" />
                <button onClick={createQR} disabled={!newQRTitle.trim() || !newQRBody.trim()} className="w-full py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50">Guardar</button>
              </div>
            )}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {quickReplies.map(qr => (
                <div key={qr.id} className="flex items-start gap-1 group">
                  <button onClick={() => { setReply(qr.body); setActiveTab('chat') }} className="flex-1 text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                    <span className="font-medium">{qr.title}</span>
                    <span className="block text-gray-400 truncate">{qr.body}</span>
                  </button>
                  <button onClick={() => deleteQR(qr.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 p-1 text-xs">x</button>
                </div>
              ))}
              {quickReplies.length === 0 && <p className="text-xs text-gray-400">Sin respuestas guardadas</p>}
            </div>
          </div>
        </div>
      )}

      {showSchedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Programar mensaje</h2>
            <div className="space-y-3">
              <textarea value={schedBody} onChange={e => setSchedBody(e.target.value)} placeholder="Mensaje..." rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Enviar el</label>
                <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSchedModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={scheduleMessage} disabled={!schedBody.trim() || !schedAt} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">Programar</button>
            </div>
          </div>
        </div>
      )}

      {showApptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Agendar cita</h2>
            <div className="space-y-3">
              <input type="text" value={apptTitle} onChange={e => setApptTitle(e.target.value)} placeholder="Titulo de la cita" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <textarea value={apptDesc} onChange={e => setApptDesc(e.target.value)} placeholder="Descripcion (opcional)" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inicio</label>
                  <input type="datetime-local" value={apptStart} onChange={e => setApptStart(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin</label>
                  <input type="datetime-local" value={apptEnd} onChange={e => setApptEnd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={apptNotify} onChange={e => setApptNotify(e.target.checked)} className="rounded" />
                Notificar al cliente por WhatsApp
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowApptModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createAppointment} disabled={!apptTitle.trim() || !apptStart || !apptEnd} className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50">Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
