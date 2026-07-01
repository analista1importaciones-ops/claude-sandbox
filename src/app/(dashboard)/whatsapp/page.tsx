'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

interface Message { id: string; remoteJid: string; phoneJid: string | null; fromMe: boolean; content: string; timestamp: string; contactId: string | null; mediaUrl: string | null; mediaType: string | null }
interface Conversation { id: string; remoteJid: string; phoneJid: string | null; content: string; timestamp: string; fromMe: boolean; unreadCount: number; convStatus: string; waName: string | null; contact: { id: string; name: string; phone: string | null } | null }
interface Contact { id: string; name: string; company: string | null; phone: string | null; email: string | null; waName: string | null; tags: string[]; serviceLabel: string; source?: string }
interface QuickReply { id: string; title: string; body: string; mediaUrl: string | null; mediaType: string | null; mediaName: string | null }
interface InternalNote { id: string; content: string; createdAt: string }
interface ScheduledMsg { id: string; body: string; sendAt: string; sent: boolean; mediaUrl: string | null; mediaType: string | null; mediaName: string | null }
interface FunnelStage { id: string; name: string; order: number; color: string }
interface Funnel { id: string; name: string; stages: FunnelStage[] }

const FUNNEL_SERVICE_MAP: Record<string, { serviceLabel: string; tag: string }> = {
  CARGAS: { serviceLabel: 'CARGA', tag: 'Carga' },
  CARGA: { serviceLabel: 'CARGA', tag: 'Carga' },
  CURSOS: { serviceLabel: 'CURSOS', tag: 'Cursos' },
  CURSO: { serviceLabel: 'CURSOS', tag: 'Cursos' },
  ASESORIA: { serviceLabel: 'ASESORIAS', tag: 'Asesorías' },
  ASESORIAS: { serviceLabel: 'ASESORIAS', tag: 'Asesorías' },
  'CLIENTES ANTIGUOS': { serviceLabel: 'OTRO', tag: 'Cliente antiguo' },
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getPhoneFromJid(jid: string) {
  if (!jid.endsWith('@s.whatsapp.net')) return null
  return jid.replace('@s.whatsapp.net', '')
}

function getPhoneFromConversation(conv: Conversation | undefined, selectedJid: string | null) {
  return conv?.contact?.phone ?? getPhoneFromJid(conv?.phoneJid ?? '') ?? (selectedJid ? getPhoneFromJid(selectedJid) : null)
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('593')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+593${digits.slice(1)}`
  if (digits.startsWith('9') && digits.length === 9) return `+593${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function getJidLabel(jid: string) {
  if (jid.endsWith('@lid')) return jid.replace('@lid', '')
  if (jid.endsWith('@g.us')) return jid.replace('@g.us', '')
  return jid
}

function getSupportedAudioMimeType() {
  const types = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return types.find(type => MediaRecorder.isTypeSupported(type)) ?? ''
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  return 'webm'
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedJid, setSelectedJid] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'inbox' | 'chat' | 'contact'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [waError, setWaError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'scheduled'>('chat')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [linkedContact, setLinkedContact] = useState<Contact | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [selectedFunnelId, setSelectedFunnelId] = useState('')
  const [assigningPipeline, setAssigningPipeline] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQR, setShowQR] = useState(false)
  const [newQRTitle, setNewQRTitle] = useState('')
  const [newQRBody, setNewQRBody] = useState('')
  const [newQRFile, setNewQRFile] = useState<File | null>(null)
  const [savingQR, setSavingQR] = useState(false)
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>([])
  const [showSchedModal, setShowSchedModal] = useState(false)
  const [schedBody, setSchedBody] = useState('')
  const [schedAt, setSchedAt] = useState('')
  const [schedFile, setSchedFile] = useState<File | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [showApptModal, setShowApptModal] = useState(false)
  const [apptTitle, setApptTitle] = useState('')
  const [apptDesc, setApptDesc] = useState('')
  const [apptStart, setApptStart] = useState('')
  const [apptEnd, setApptEnd] = useState('')
  const [apptNotify, setApptNotify] = useState(true)
  const [showQRPicker, setShowQRPicker] = useState(false)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [convSearch, setConvSearch] = useState('')
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Contact edit state
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', company: '', waName: '', tags: [] as string[], serviceLabel: 'OTRO' })
  const [savingContact, setSavingContact] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
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
    const data = await res.json().catch(() => null)
    if (res.ok && Array.isArray(data)) {
      setConversations(data)
      setWaError('')
    } else if (!res.ok) {
      setWaError(data?.error ?? 'No se pudieron cargar las conversaciones.')
    }
  }
  function isNearBottom() {
    const el = messagesRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140
  }
  async function loadMessages(jid: string, options: { forceScroll?: boolean } = {}) {
    const shouldScroll = options.forceScroll || stickToBottomRef.current || isNearBottom()
    const res = await fetch('/api/whatsapp/messages?jid=' + encodeURIComponent(jid))
    const data = await res.json().catch(() => null)
    if (res.ok && Array.isArray(data)) {
      setMessages(data)
      setWaError('')
      if (shouldScroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: options.forceScroll ? 'auto' : 'smooth' }), 80)
    } else {
      setMessages([])
      setWaError(data?.error ?? 'No se pudieron cargar los mensajes.')
    }
  }
  async function loadContacts() {
    const res = await fetch('/api/contacts?limit=200')
    if (res.ok) { const d = await res.json(); setContacts(d.contacts ?? d) }
  }
  async function loadFunnels() {
    const res = await fetch('/api/crm/funnels')
    if (!res.ok) return
    const data = await res.json()
    const rows = Array.isArray(data) ? data : data.funnels
    if (!Array.isArray(rows)) return
    setFunnels(rows)
    setSelectedFunnelId(current => current || rows[0]?.id || '')
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
  async function markRead(jid: string) {
    await fetch('/api/whatsapp/conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: jid, action: 'read' }) })
    loadConversations()
  }
  async function markAttended(jid: string) {
    await fetch('/api/whatsapp/conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: jid, action: 'attended' }) })
    loadConversations()
  }
  async function sendReply() {
    if ((!reply.trim() && !attachFile) || !selectedJid) return
    setSending(true)
    try {
      let res: Response
      if (attachFile) {
        const fd = new FormData()
        fd.append('to', selectedJid)
        fd.append('file', attachFile)
        if (reply.trim()) fd.append('caption', reply)
        if (linkedContact?.id) fd.append('contactId', linkedContact.id)
        res = await fetch('/api/whatsapp/send-media', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: selectedJid, body: reply, contactId: linkedContact?.id }) })
      }
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar el mensaje.')

      setReply('')
      setAttachFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setWaError('')
      await Promise.all([loadMessages(selectedJid, { forceScroll: true }), loadConversations()])
    } catch (error) {
      setWaError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  function renderMedia(m: Message) {
    if (!m.mediaUrl) return <p className="whitespace-pre-wrap break-words">{m.content}</p>
    if (m.mediaType === 'image') return (
      <a href={m.mediaUrl} target="_blank" rel="noreferrer">
        <img src={m.mediaUrl} alt="imagen" className="max-w-[200px] rounded-lg mb-1" />
        {m.content && m.content !== '[image]' && <p className="text-xs mt-1">{m.content}</p>}
      </a>
    )
    if (m.mediaType === 'audio') return (
      <audio controls src={m.mediaUrl} className="max-w-[220px]" />
    )
    if (m.mediaType === 'video') return (
      <video controls src={m.mediaUrl} className="max-w-[200px] rounded-lg" />
    )
    return (
      <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-xs">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        {m.content || 'Documento'}
      </a>
    )
  }

  function openContactEdit(c?: Contact | null) {
    const conv = conversations.find(x => x.remoteJid === selectedJid)
    const phone = normalizePhone(c?.phone ?? getPhoneFromConversation(conv, selectedJid)) ?? ''
    const matchedFunnel = getFunnelForContact(c ?? null)
    if (matchedFunnel) setSelectedFunnelId(matchedFunnel.id)
    if (c) {
      setContactForm({ name: c.name, phone: c.phone ?? phone, email: c.email ?? '', company: c.company ?? '', waName: c.waName ?? conv?.waName ?? '', tags: c.tags ?? [], serviceLabel: c.serviceLabel ?? 'OTRO' })
    } else {
      setContactForm({ name: conv?.waName ?? conv?.contact?.name ?? '', phone, email: '', company: '', waName: conv?.waName ?? '', tags: [], serviceLabel: 'OTRO' })
    }
    setEditingContact(true)
  }

  async function saveContact() {
    setSavingContact(true)
    try {
      if (linkedContact) {
        const res = await fetch(`/api/contacts/${linkedContact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contactForm, remoteJid: selectedJid }) })
        if (res.ok) { const updated = await res.json(); setLinkedContact(updated) }
      } else {
        const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contactForm, remoteJid: selectedJid, source: 'OTRO' }) })
        if (res.ok) { const created = await res.json(); setLinkedContact(created) }
      }
      setEditingContact(false)
      loadContacts()
      loadConversations()
    } finally {
      setSavingContact(false)
    }
  }

  function getFunnelService(funnelName: string | null | undefined) {
    return FUNNEL_SERVICE_MAP[normalizeText(funnelName)] ?? { serviceLabel: 'OTRO', tag: funnelName?.trim() || 'WhatsApp' }
  }

  function tagsForFunnel(funnelName: string, currentTags: string[] = []) {
    const service = getFunnelService(funnelName)
    const keep = currentTags.filter(tag => {
      const normalized = normalizeText(tag)
      return normalized !== 'WHATSAPP' && !Object.values(FUNNEL_SERVICE_MAP).some(item => normalizeText(item.tag) === normalized)
    })
    return [...keep, service.tag, 'WhatsApp']
  }

  function getFunnelForContact(contact: Contact | null) {
    if (!contact || funnels.length === 0) return null
    const values = [contact.serviceLabel, ...(contact.tags ?? [])].map(normalizeText)
    return funnels.find(funnel => {
      const service = getFunnelService(funnel.name)
      return values.includes(normalizeText(service.serviceLabel)) || values.includes(normalizeText(service.tag)) || values.includes(normalizeText(funnel.name))
    }) ?? null
  }

  function applyFunnelToForm(funnelId: string) {
    setSelectedFunnelId(funnelId)
    const funnel = funnels.find(item => item.id === funnelId)
    if (!funnel) return
    const service = getFunnelService(funnel.name)
    setContactForm(form => ({
      ...form,
      serviceLabel: service.serviceLabel,
      tags: tagsForFunnel(funnel.name, form.tags),
    }))
  }

  async function assignContactToPipeline() {
    if (!linkedContact || !selectedFunnelId) return
    const funnel = funnels.find(item => item.id === selectedFunnelId)
    const firstStage = funnel?.stages?.slice().sort((a, b) => a.order - b.order)[0]
    if (!funnel || !firstStage) {
      alert('Ese embudo no tiene etapas configuradas.')
      return
    }

    setAssigningPipeline(true)
    try {
      const service = getFunnelService(funnel.name)
      const updatedTags = tagsForFunnel(funnel.name, linkedContact.tags)
      const updateRes = await fetch(`/api/contacts/${linkedContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkedContact.name,
          phone: linkedContact.phone,
          email: linkedContact.email,
          company: linkedContact.company,
          waName: linkedContact.waName,
          tags: updatedTags,
          serviceLabel: service.serviceLabel,
          remoteJid: selectedJid,
        }),
      })
      if (!updateRes.ok) throw new Error('No se pudo actualizar el contacto.')
      const updatedContact = await updateRes.json()
      setLinkedContact(updatedContact)

      const dealRes = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: linkedContact.id,
          funnelStageId: firstStage.id,
          notes: `Asignado desde WhatsApp al embudo ${funnel.name}`,
        }),
      })
      if (!dealRes.ok) {
        const data = await dealRes.json().catch(() => null)
        throw new Error(data?.error || 'No se pudo asignar al pipeline.')
      }
      alert(`Contacto asignado a ${funnel.name} / ${firstStage.name}.`)
      loadContacts()
      loadConversations()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo asignar al pipeline.')
    } finally {
      setAssigningPipeline(false)
    }
  }

  async function startRecording() {
    if (!selectedJid) return
    const jid = selectedJid
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: BlobPart[] = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        try {
          stream.getTracks().forEach(t => t.stop())
          if (chunks.length === 0) throw new Error('La grabación quedó vacía')
          const finalMimeType = mimeType || 'audio/webm'
          const blob = new Blob(chunks, { type: finalMimeType })
          const file = new File([blob], `audio.${getAudioExtension(finalMimeType)}`, { type: finalMimeType })
          const fd = new FormData()
          fd.append('to', jid)
          fd.append('file', file)
          fd.append('ptt', 'true')
          if (linkedContact?.id) fd.append('contactId', linkedContact.id)
          const res = await fetch('/api/whatsapp/send-media', { method: 'POST', body: fd })
          if (!res.ok) {
            const data = await res.json().catch(() => null)
            throw new Error(data?.error || 'No se pudo enviar el audio')
          }
          loadMessages(jid, { forceScroll: true }); loadConversations()
        } catch (error) {
          alert(error instanceof Error ? error.message : 'No se pudo enviar el audio')
        } finally {
          setRecording(false); setRecSeconds(0)
        }
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true); setRecSeconds(0)
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  function stopRecording() {
    if (recTimerRef.current) clearInterval(recTimerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function cancelRecording() {
    if (recTimerRef.current) clearInterval(recTimerRef.current)
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = null
    mediaRecorderRef.current?.stop()
    setRecording(false); setRecSeconds(0)
  }

  async function saveNote() {
    if (!newNote.trim() || !selectedJid) return
    await fetch('/api/whatsapp/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: selectedJid, content: newNote, contactId: linkedContact?.id }) })
    setNewNote(''); loadNotes(selectedJid)
  }
  async function createQR() {
    if (!newQRTitle.trim() || !newQRBody.trim()) return
    setSavingQR(true)
    try {
      let media: { mediaUrl?: string; mediaType?: string; mediaName?: string } = {}
      if (newQRFile) {
        const fd = new FormData()
        fd.append('file', newQRFile)
        const uploadRes = await fetch('/api/templates/media', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json().catch(() => null)
        if (!uploadRes.ok) throw new Error(uploadData?.error || 'No se pudo guardar el adjunto.')
        media = uploadData
      }
      const res = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newQRTitle, body: newQRBody, ...media }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la respuesta rápida.')
      setNewQRTitle(''); setNewQRBody(''); setNewQRFile(null); setWaError(''); loadQuickReplies()
    } catch (error) {
      setWaError(error instanceof Error ? error.message : 'No se pudo guardar la respuesta rápida.')
    } finally {
      setSavingQR(false)
    }
  }

  async function applyQuickReply(qr: QuickReply) {
    setReply(qr.body)
    setAttachFile(null)
    if (qr.mediaUrl) {
      try {
        const res = await fetch(qr.mediaUrl)
        if (!res.ok) throw new Error('No se pudo cargar el adjunto guardado.')
        const blob = await res.blob()
        setAttachFile(new File([blob], qr.mediaName || 'adjunto', { type: blob.type || 'application/octet-stream' }))
      } catch (error) {
        setWaError(error instanceof Error ? error.message : 'No se pudo cargar el adjunto guardado.')
      }
    }
    setShowQRPicker(false)
    setActiveTab('chat')
  }
  async function deleteQR(id: string) {
    await fetch('/api/quick-replies/' + id, { method: 'DELETE' }); loadQuickReplies()
  }
  async function scheduleMessage() {
    if ((!schedBody.trim() && !schedFile) || !schedAt || !selectedJid) return
    setScheduling(true)
    try {
      let media: { mediaUrl?: string; mediaType?: string; mediaName?: string } = {}
      if (schedFile) {
        const fd = new FormData()
        fd.append('file', schedFile)
        const uploadRes = await fetch('/api/templates/media', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json().catch(() => null)
        if (!uploadRes.ok) throw new Error(uploadData?.error || 'No se pudo guardar el adjunto.')
        media = uploadData
      }
      const res = await fetch('/api/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid: selectedJid,
          body: schedBody.trim() || schedFile?.name || 'Adjunto',
          sendAt: new Date(schedAt).toISOString(),
          contactId: linkedContact?.id,
          ...media,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo programar el mensaje.')
      setSchedBody(''); setSchedAt(''); setSchedFile(null); setShowSchedModal(false); setWaError('')
      loadScheduled(selectedJid)
    } catch (error) {
      setWaError(error instanceof Error ? error.message : 'No se pudo programar el mensaje.')
    } finally {
      setScheduling(false)
    }
  }
  async function createAppointment() {
    if (!apptTitle.trim() || !apptStart || !apptEnd) return
    await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: apptTitle, description: apptDesc, startAt: new Date(apptStart).toISOString(), endAt: new Date(apptEnd).toISOString(), contactId: linkedContact?.id, contactName: selectedConv?.contact?.name ?? selectedConv?.waName, remoteJid: apptNotify ? selectedJid : undefined, notifyClient: apptNotify }) })
    setApptTitle(''); setApptDesc(''); setApptStart(''); setApptEnd(''); setShowApptModal(false)
  }

  useEffect(() => {
    pollStatus(); loadConversations(); loadContacts(); loadFunnels(); loadQuickReplies()
    const si = setInterval(pollStatus, 5000)
    const sc = setInterval(loadConversations, 5000)
    return () => { clearInterval(si); clearInterval(sc) }
  }, [])

  useEffect(() => {
    if (selectedJid) {
      stickToBottomRef.current = true
      loadMessages(selectedJid, { forceScroll: true }); loadNotes(selectedJid); loadScheduled(selectedJid)
      markRead(selectedJid)
      const conv = conversations.find(c => c.remoteJid === selectedJid)
      if (conv?.contact) {
        const full = contacts.find(c => c.id === conv.contact!.id)
        const contact = full ?? { id: conv.contact.id, name: conv.contact.name, company: null, phone: null, email: null, waName: conv.waName, tags: [], serviceLabel: 'OTRO' }
        setLinkedContact(contact)
        const matchedFunnel = getFunnelForContact(contact)
        if (matchedFunnel) setSelectedFunnelId(matchedFunnel.id)
      } else {
        setLinkedContact(null)
      }
      setEditingContact(false)
      setActiveTab('chat')
      const iv = setInterval(() => loadMessages(selectedJid), 5000)
      return () => clearInterval(iv)
    }
  }, [selectedJid])

  const safeConversations = Array.isArray(conversations) ? conversations : []
  const safeMessages = Array.isArray(messages) ? messages : []
  const safeContacts = Array.isArray(contacts) ? contacts : []
  const safeQuickReplies = Array.isArray(quickReplies) ? quickReplies : []
  const safeNotes = Array.isArray(notes) ? notes : []
  const safeScheduled = Array.isArray(scheduled) ? scheduled : []
  const selectedConv = safeConversations.find(c => c.remoteJid === selectedJid)
  const selectedPhone = normalizePhone(linkedContact?.phone ?? getPhoneFromConversation(selectedConv, selectedJid))
  const selectedJidLabel = selectedJid ? getJidLabel(selectedJid) : ''
  const selectedFunnel = funnels.find(funnel => funnel.id === selectedFunnelId) ?? null
  const selectedFunnelFirstStage = selectedFunnel?.stages?.slice().sort((a, b) => a.order - b.order)[0] ?? null
  const filteredConversations = safeConversations.filter(c => {
    if (!convSearch.trim()) return true
    const name = (c.contact?.name ?? c.waName ?? c.remoteJid).toLowerCase()
    const phone = normalizePhone(c.contact?.phone ?? getPhoneFromJid(c.phoneJid ?? '') ?? getPhoneFromJid(c.remoteJid)) ?? ''
    return name.includes(convSearch.toLowerCase()) || phone.includes(convSearch)
  })
  const filteredContacts = safeContacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone ?? '').includes(contactSearch))

  return (
    <div className="flex h-[calc(100dvh-64px)] min-w-0 overflow-hidden">
      {/* Left: conversation list */}
      <div className={`${mobileView === 'inbox' ? 'flex' : 'hidden'} w-full border-r border-gray-100 bg-white md:flex md:w-72 flex-col`}>
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
        <div className="px-3 py-2 border-b border-gray-100">
          <input type="text" value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Buscar chat..." className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {safeConversations.length === 0
            ? <p className="text-xs text-gray-400 text-center mt-8 px-4">{status === 'connected' ? 'Los chats apareceran aqui cuando recibas mensajes' : 'Conecta WhatsApp para ver los chats'}</p>
            : filteredConversations.map(conv => (
              <button key={conv.remoteJid} onClick={() => { setSelectedJid(conv.remoteJid); setMobileView('chat') }}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedJid === conv.remoteJid ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                    {conv.contact?.name ?? conv.waName ?? getJidLabel(conv.remoteJid)}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {conv.unreadCount > 0 && (
                      <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(conv.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {conv.convStatus === 'ATTENDED' && <span className="text-xs bg-gray-100 text-gray-500 rounded px-1">Atendido</span>}
                  <p className="text-xs text-gray-400 truncate">{conv.fromMe ? 'Tu: ' : ''}{conv.content}</p>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Center: chat */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} flex-1 flex-col bg-gray-50 min-w-0 md:flex`}>
        {waError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
            {waError}
          </div>
        )}
        {!selectedJid
          ? <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{status === 'connected' ? 'Selecciona una conversacion' : 'Conecta WhatsApp para ver los chats'}</div>
          : <>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <button onClick={() => setMobileView('inbox')} className="md:hidden rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600">Volver</button>
                <div className="min-w-0">
                <p className="font-medium text-gray-800">{selectedConv?.contact?.name ?? selectedConv?.waName ?? getJidLabel(selectedJid)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedPhone ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-100">
                      Tel: {selectedPhone}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                      ID WhatsApp: {selectedJidLabel}
                    </span>
                  )}
                </div>
                </div>
              </div>
              <div className="flex gap-2 items-center overflow-x-auto">
                <button onClick={() => setMobileView('contact')} className="md:hidden px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Perfil</button>
                {selectedConv && selectedConv.convStatus !== 'ATTENDED' && (
                  <button onClick={() => markAttended(selectedJid)} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Atendido</button>
                )}
                {selectedConv && selectedConv.convStatus === 'ATTENDED' && (
                  <button onClick={async () => { await fetch('/api/whatsapp/conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remoteJid: selectedJid, action: 'reopen' }) }); loadConversations() }} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Reabrir</button>
                )}
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
                <div
                  ref={messagesRef}
                  onScroll={() => { stickToBottomRef.current = isNearBottom() }}
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2"
                >
                  {safeMessages.map(m => (
                    <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82vw] sm:max-w-xs px-3 py-2 rounded-xl text-sm ${m.fromMe ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        {renderMedia(m)}
                        <div className={`text-xs mt-1 ${m.fromMe ? 'text-green-100' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-gray-200 bg-white px-3 sm:px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2 items-center flex-col">
                  {attachFile && (
                    <div className="w-full flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-700">
                      <span className="flex-1 truncate">{attachFile.name}</span>
                      <button onClick={() => setAttachFile(null)} className="text-red-400 hover:text-red-600">x</button>
                    </div>
                  )}
                  {recording ? (
                    <div className="flex gap-3 items-center w-full bg-red-50 border border-red-200 rounded-full px-4 py-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-sm text-red-600 font-medium flex-1">Grabando... {Math.floor(recSeconds/60)}:{String(recSeconds%60).padStart(2,'0')}</span>
                      <button onClick={cancelRecording} className="text-xs text-gray-500 hover:text-gray-700 px-2">Cancelar</button>
                      <button onClick={stopRecording} className="px-4 py-1 bg-red-500 text-white rounded-full text-sm hover:bg-red-600">Enviar</button>
                    </div>
                  ) : (
                  <div className="flex gap-2 items-center w-full">
                    <label className="p-2 text-gray-400 hover:text-blue-500 cursor-pointer" title="Adjuntar archivo">
                      <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={e => {
                        const file = e.target.files?.[0] ?? null
                        if (file && file.size > 25 * 1024 * 1024) {
                          setWaError('El archivo supera el límite de 25 MB.')
                          e.target.value = ''
                          return
                        }
                        setAttachFile(file)
                        setWaError('')
                      }} />
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </label>
                    <div className="relative">
                      <button onClick={() => setShowQRPicker(!showQRPicker)} className="p-2 text-gray-400 hover:text-yellow-500" title="Respuestas rapidas">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </button>
                      {showQRPicker && safeQuickReplies.length > 0 && (
                        <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto z-10">
                          {safeQuickReplies.map(qr => (
                            <button key={qr.id} onClick={() => applyQuickReply(qr)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <p className="text-xs font-medium text-gray-700">{qr.title}</p>
                              <p className="text-xs text-gray-400 truncate">{qr.body}</p>
                              {qr.mediaName && <p className="text-[10px] text-blue-500 truncate">Adjunto: {qr.mediaName}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="text" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Escribe un mensaje..." className="min-w-0 flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <button onClick={startRecording} className="p-2 text-gray-400 hover:text-red-500" title="Grabar audio">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                    <button onClick={sendReply} disabled={sending || (!reply.trim() && !attachFile)} className="px-4 py-2 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 disabled:opacity-50">Enviar</button>
                  </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 gap-3">
                <div className="flex-1 overflow-y-auto space-y-2">
                  {safeNotes.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No hay notas internas</p>}
                  {safeNotes.map(n => (
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
                  {safeScheduled.length === 0 && <p className="text-xs text-gray-400 text-center mt-8">No hay mensajes programados</p>}
                  {safeScheduled.map(s => (
                    <div key={s.id} className={`border rounded-lg px-3 py-2 ${s.sent ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className="text-sm text-gray-800">{s.body}</p>
                      {s.mediaName && <p className="text-xs text-blue-600 mt-1">Adjunto: {s.mediaName}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(s.sendAt).toLocaleString('es-GT')} {s.sent ? 'Enviado' : 'Pendiente'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
      </div>

      {/* Right: contact panel */}
      {selectedJid && (
        <div className={`${mobileView === 'contact' ? 'flex' : 'hidden'} w-full border-l border-gray-100 bg-white overflow-y-auto md:flex md:w-72 flex-col`}>
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setMobileView('chat')} className="md:hidden rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600">Chat</button>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto CRM</p>
              </div>
              {!editingContact && (
                <button onClick={() => openContactEdit(linkedContact)} className="text-xs text-blue-500 hover:text-blue-700">
                  {linkedContact ? 'Editar' : '+ Nuevo'}
                </button>
              )}
            </div>

            {editingContact ? (
              <div className="space-y-2">
                <input type="text" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre *" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
                <input type="text" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
                <input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
                <input type="text" value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} placeholder="Empresa" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Embudo del cliente</label>
                  <select value={selectedFunnelId} onChange={e => applyFunnelToForm(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">Seleccionar embudo</option>
                    {funnels.map(funnel => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Esto define la etiqueta del servicio y el pipeline que activara los seguimientos.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingContact(false)} className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button onClick={saveContact} disabled={savingContact || !contactForm.name.trim()} className="flex-1 px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                    {savingContact ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : linkedContact ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-800">{linkedContact.name}</p>
                {linkedContact.company && <p className="text-xs text-gray-500">{linkedContact.company}</p>}
                <a href={`/crm/contacts/${linkedContact.id}`} className="inline-flex mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Ver en CRM
                </a>
                <div className="mt-2 rounded-md bg-white/70 border border-green-100 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{selectedPhone ? 'Número WhatsApp' : 'ID WhatsApp'}</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedPhone ?? selectedJidLabel}</p>
                  {!selectedPhone && <p className="text-xs text-amber-600">Completa el teléfono real del cliente.</p>}
                </div>
                {linkedContact.waName && <p className="text-xs text-gray-400">WA: {linkedContact.waName}</p>}
                <div className="mt-3 rounded-md bg-white/80 border border-green-100 px-2 py-2">
                  <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Embudo / pipeline</label>
                  <select value={selectedFunnelId} onChange={e => setSelectedFunnelId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">Seleccionar embudo</option>
                    {funnels.map(funnel => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
                  </select>
                  <button
                    onClick={assignContactToPipeline}
                    disabled={assigningPipeline || !selectedFunnelId || !selectedFunnelFirstStage}
                    className="mt-2 w-full px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {assigningPipeline ? 'Asignando...' : `Asignar a ${selectedFunnelFirstStage?.name ?? 'pipeline'}`}
                  </button>
                  {selectedFunnel && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Se creara la oportunidad en {selectedFunnel.name}.
                    </p>
                  )}
                </div>
                <button onClick={() => setLinkedContact(null)} className="text-xs text-red-400 hover:text-red-600 mt-1">Desvincular</button>
              </div>
            ) : (
              <div>
                <div className="mb-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{selectedPhone ? 'Número WhatsApp' : 'ID WhatsApp'}</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedPhone ?? selectedJidLabel}</p>
                  {!selectedPhone && <p className="text-xs text-amber-600">WhatsApp no entregó el número real.</p>}
                </div>
                <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Buscar contacto..." className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 mb-2" />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredContacts.slice(0, 10).map(c => (
                    <button key={c.id} onClick={() => { setLinkedContact(c); setSelectedFunnelId(getFunnelForContact(c)?.id ?? selectedFunnelId); setContactSearch('') }} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">{c.name}{c.company ? ' - ' + c.company : ''}</button>
                  ))}
                </div>
              </div>
            )}
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
                <label className="block w-full rounded border border-dashed border-blue-300 px-2 py-1.5 text-xs text-blue-600 cursor-pointer hover:bg-blue-50">
                  <input type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    if (file && file.size > 25 * 1024 * 1024) {
                      setWaError('El archivo supera el límite de 25 MB.')
                      e.target.value = ''
                      return
                    }
                    setNewQRFile(file)
                  }} />
                  {newQRFile ? `Adjunto: ${newQRFile.name}` : 'Adjuntar archivo (opcional)'}
                </label>
                <button onClick={createQR} disabled={savingQR || !newQRTitle.trim() || !newQRBody.trim()} className="w-full py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50">{savingQR ? 'Guardando...' : 'Guardar'}</button>
              </div>
            )}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {safeQuickReplies.map(qr => (
                <div key={qr.id} className="flex items-start gap-1 group">
                  <button onClick={() => applyQuickReply(qr)} className="flex-1 text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                    <span className="font-medium">{qr.title}</span>
                    <span className="block text-gray-400 truncate">{qr.body}</span>
                    {qr.mediaName && <span className="block text-blue-500 truncate">Adjunto: {qr.mediaName}</span>}
                  </button>
                  <button onClick={() => deleteQR(qr.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 p-1 text-xs">x</button>
                </div>
              ))}
              {safeQuickReplies.length === 0 && <p className="text-xs text-gray-400">Sin respuestas guardadas</p>}
            </div>
          </div>
        </div>
      )}

      {showSchedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-sm p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Programar mensaje</h2>
            <div className="space-y-3">
              <textarea value={schedBody} onChange={e => setSchedBody(e.target.value)} placeholder="Mensaje..." rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <label className="block w-full border border-dashed border-blue-300 rounded-lg px-3 py-2 text-sm text-blue-700 cursor-pointer hover:bg-blue-50">
                <input type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={e => {
                  const file = e.target.files?.[0] ?? null
                  if (file && file.size > 25 * 1024 * 1024) {
                    setWaError('El archivo supera el límite de 25 MB.')
                    e.target.value = ''
                    return
                  }
                  setSchedFile(file)
                  setWaError('')
                }} />
                {schedFile ? `Adjunto: ${schedFile.name}` : 'Adjuntar imagen, audio, video o documento'}
              </label>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Enviar el</label>
                <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowSchedModal(false); setSchedFile(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={scheduleMessage} disabled={scheduling || (!schedBody.trim() && !schedFile) || !schedAt} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">{scheduling ? 'Guardando...' : 'Programar'}</button>
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
