'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

interface Message {
  id: string
  remoteJid: string
  fromMe: boolean
  content: string
  timestamp: string
  contactId: string | null
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [selectedJid, setSelectedJid] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function pollStatus() {
    const res = await fetch('/api/whatsapp/status')
    const data = await res.json()
    setStatus(data.status)
    if (data.qrCode) {
      const url = await QRCode.toDataURL(data.qrCode)
      setQrUrl(url)
    } else {
      setQrUrl(null)
    }
  }

  async function connect() {
    await fetch('/api/whatsapp/status', { method: 'POST' })
    pollStatus()
  }

  async function loadMessages(jid: string) {
    const res = await fetch(`/api/whatsapp/messages?jid=${encodeURIComponent(jid)}`)
    const data = await res.json()
    setMessages(data)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function sendReply() {
    if (!reply.trim() || !selectedJid) return
    setSending(true)
    await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selectedJid, body: reply }),
    })
    setReply('')
    setSending(false)
    loadMessages(selectedJid)
  }

  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedJid) {
      loadMessages(selectedJid)
      const interval = setInterval(() => loadMessages(selectedJid), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedJid])

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
            <button onClick={connect} className="mt-2 w-full px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
              Conectar
            </button>
          )}
        </div>

        {qrUrl && (
          <div className="p-4 flex flex-col items-center border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Escanea con WhatsApp</p>
            <img src={qrUrl} alt="QR" className="w-48 h-48" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {status === 'connected' && (
            <p className="text-xs text-gray-400 text-center mt-8">Los chats aparecerán aquí cuando recibas mensajes</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedJid ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {status === 'connected' ? 'Selecciona una conversación' : 'Conecta WhatsApp para ver los chats'}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.fromMe ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                    {m.content}
                    <div className={`text-xs mt-1 ${m.fromMe ? 'text-green-100' : 'text-gray-400'}`}>
                      {new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-3">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Escribe un mensaje..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
