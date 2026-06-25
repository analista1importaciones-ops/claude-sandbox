import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { prisma } from './prisma'

const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(process.cwd(), '.wa-auth')
const MEDIA_DIR = path.join(process.cwd(), 'public', 'wa-media')

type WaSocket = ReturnType<typeof makeWASocket>
type WaStatus = 'disconnected' | 'connecting' | 'connected'

declare global {
  var __waSock: WaSocket | null
  var __waQr: string | null
  var __waStatus: WaStatus
  var __waStartPromise: Promise<void> | null
  var __waSupervisorStarted: boolean
  var __waLoggedOut: boolean
  var __waLastReconnectAt: number
}

if (!global.__waStatus) global.__waStatus = 'disconnected'
if (global.__waQr === undefined) global.__waQr = null
if (global.__waSock === undefined) global.__waSock = null
if (global.__waStartPromise === undefined) global.__waStartPromise = null
if (global.__waSupervisorStarted === undefined) global.__waSupervisorStarted = false
if (global.__waLoggedOut === undefined) global.__waLoggedOut = false
if (global.__waLastReconnectAt === undefined) global.__waLastReconnectAt = 0

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getWAStatus() {
  return {
    status: global.__waStatus,
    qrCode: global.__waQr,
    loggedOut: global.__waLoggedOut,
  }
}

function getMediaExt(type: string) {
  if (type === 'imageMessage') return 'jpg'
  if (type === 'audioMessage') return 'ogg'
  if (type === 'videoMessage') return 'mp4'
  if (type === 'documentMessage') return 'pdf'
  return 'bin'
}

function getMediaType(type: string) {
  if (type === 'imageMessage') return 'image'
  if (type === 'audioMessage') return 'audio'
  if (type === 'videoMessage') return 'video'
  if (type === 'documentMessage') return 'document'
  return 'file'
}

function getPhoneJidFromMessage(msg: any) {
  const candidates = [
    msg.key?.remoteJidAlt,
    msg.key?.participantAlt,
    msg.key?.participant,
    msg.key?.remoteJid,
  ].filter(Boolean) as string[]
  return candidates.find(jid => jid.endsWith('@s.whatsapp.net')) ?? null
}

function phoneFromJid(jid: string | null | undefined) {
  if (!jid?.endsWith('@s.whatsapp.net')) return null
  return jid.replace('@s.whatsapp.net', '')
}

function normalizeRecipient(to: string) {
  if (to.includes('@')) return to
  let digits = to.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) digits = `593${digits.slice(1)}`
  return `${digits}@s.whatsapp.net`
}

function mediaSource(mediaUrl: string) {
  if (/^https?:\/\//i.test(mediaUrl)) return { url: mediaUrl }
  const clean = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl
  return { url: path.join(process.cwd(), 'public', clean) }
}

async function saveMedia(msg: any, msgType: string, messageId: string): Promise<{ mediaUrl: string; mediaType: string } | null> {
  try {
    ensureDir(MEDIA_DIR)
    const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
    const ext = getMediaExt(msgType)
    const filename = `${messageId}.${ext}`
    fs.writeFileSync(path.join(MEDIA_DIR, filename), buffer)
    return { mediaUrl: `/wa-media/${filename}`, mediaType: getMediaType(msgType) }
  } catch (e) {
    console.error('[WhatsApp] media download error:', e)
    return null
  }
}

function scheduleReconnect(delayMs = 5000) {
  if (global.__waLoggedOut) return
  const now = Date.now()
  if (now - global.__waLastReconnectAt < 3000) return
  global.__waLastReconnectAt = now
  setTimeout(() => {
    startWhatsApp().catch(error => console.error('[WhatsApp] reconnect failed:', error))
  }, delayMs)
}

export async function startWhatsApp(options: { manual?: boolean } = {}) {
  if (global.__waStatus === 'connected') return
  if (global.__waStartPromise) return global.__waStartPromise
  if (global.__waLoggedOut && !options.manual) return

  global.__waStartPromise = (async () => {
    global.__waStatus = 'connecting'
    global.__waQr = null
    global.__waLoggedOut = false

    try {
      ensureDir(AUTH_DIR)
      ensureDir(MEDIA_DIR)
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
      const versionResult = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1015901307] as [number, number, number],
      }))

      const sock = makeWASocket({
        version: versionResult.version,
        auth: state,
        printQRInTerminal: true,
        browser: ['GTL CRM', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        markOnlineOnConnect: false,
      })
      global.__waSock = sock

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('lid-mapping.update' as any, async ({ lid, pn }: { lid: string; pn: string }) => {
        if (!lid || !pn) return
        await prisma.waConversation.updateMany({ where: { remoteJid: lid }, data: { phoneJid: pn } }).catch(() => {})
        await prisma.whatsAppMessage.updateMany({ where: { remoteJid: lid }, data: { phoneJid: pn } }).catch(() => {})
      })

      sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          global.__waQr = qr
          global.__waStatus = 'connecting'
        }
        if (connection === 'open') {
          global.__waQr = null
          global.__waStatus = 'connected'
          global.__waLoggedOut = false
        }
        if (connection === 'close') {
          global.__waStatus = 'disconnected'
          global.__waQr = null
          global.__waSock = null
          const code = (lastDisconnect?.error as Boom)?.output?.statusCode
          if (code === DisconnectReason.loggedOut) {
            global.__waLoggedOut = true
            console.warn('[WhatsApp] session logged out. Scan QR again.')
            return
          }
          scheduleReconnect()
        }
      })

      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message) continue
          const jid = msg.key.remoteJid!
          if (jid.includes('status@broadcast') || jid.includes('@broadcast') || jid.endsWith('@g.us')) continue
          const phoneJid = getPhoneJidFromMessage(msg)
          const phone = phoneFromJid(phoneJid) ?? phoneFromJid(jid) ?? jid.replace('@lid', '')
          const pushName = msg.pushName || null
          const fromMe = msg.key.fromMe ?? false
          const msgType = Object.keys(msg.message)[0]
          const isMedia = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'].includes(msgType)

          const content = msg.message.conversation
            || msg.message.extendedTextMessage?.text
            || msg.message.imageMessage?.caption
            || msg.message.videoMessage?.caption
            || msg.message.documentMessage?.fileName
            || `[${msgType.replace('Message', '')}]`

          let mediaData: { mediaUrl: string; mediaType: string } | null = null
          if (isMedia) mediaData = await saveMedia(msg, msgType, msg.key.id!)

          let contact = await prisma.contact.findFirst({ where: { phone: { contains: phone.slice(-8) } } })
          if (!contact && !fromMe && pushName && phoneJid) {
            contact = await prisma.contact.create({
              data: { name: pushName, phone, waName: pushName, source: 'OTRO', serviceLabel: 'OTRO', tags: ['WhatsApp'] },
            }).catch(() => null)
          } else if (contact && pushName && !contact.waName) {
            await prisma.contact.update({ where: { id: contact.id }, data: { waName: pushName } }).catch(() => {})
          }

          await prisma.whatsAppMessage.create({
            data: {
              remoteJid: jid,
              fromMe,
              content,
              phoneJid,
              messageId: msg.key.id!,
              timestamp: new Date(Number(msg.messageTimestamp) * 1000),
              contactId: contact?.id ?? null,
              mediaUrl: mediaData?.mediaUrl ?? null,
              mediaType: mediaData?.mediaType ?? null,
              waName: pushName,
            },
          }).catch(() => {})

          await prisma.waConversation.upsert({
            where: { remoteJid: jid },
            create: { remoteJid: jid, phoneJid, unreadCount: fromMe ? 0 : 1, status: 'OPEN' },
            update: {
              unreadCount: fromMe ? undefined : { increment: 1 },
              status: 'OPEN',
              ...(phoneJid ? { phoneJid } : {}),
            },
          }).catch(() => {})
        }
      })
    } catch (err) {
      console.error('[WhatsApp] startWhatsApp error:', err)
      global.__waStatus = 'disconnected'
      scheduleReconnect(10000)
    } finally {
      global.__waStartPromise = null
    }
  })()

  return global.__waStartPromise
}

export function ensureWhatsAppSupervisor() {
  if (global.__waSupervisorStarted) return
  global.__waSupervisorStarted = true
  startWhatsApp().catch(error => console.error('[WhatsApp] supervisor start failed:', error))
  setInterval(() => {
    if (global.__waStatus === 'disconnected' && !global.__waLoggedOut) {
      startWhatsApp().catch(error => console.error('[WhatsApp] supervisor reconnect failed:', error))
    }
  }, 30000)
}

export async function ensureWhatsAppReady() {
  ensureWhatsAppSupervisor()
  if (global.__waStatus !== 'connected') {
    await startWhatsApp()
  }
  if (!global.__waSock || global.__waStatus !== 'connected') {
    throw new Error(global.__waLoggedOut ? 'WhatsApp requiere escanear QR nuevamente' : 'WhatsApp no conectado')
  }
  return global.__waSock
}

export async function sendWAMessage(to: string, body: string) {
  const sock = await ensureWhatsAppReady()
  const jid = normalizeRecipient(to)
  try {
    await sock.sendMessage(jid, { text: body })
    return jid
  } catch (error) {
    global.__waStatus = 'disconnected'
    global.__waSock = null
    scheduleReconnect()
    throw error
  }
}

export async function sendWAMediaMessage(to: string, body: string, mediaUrl: string, mediaType: string | null | undefined, mediaName?: string | null) {
  const sock = await ensureWhatsAppReady()
  const jid = normalizeRecipient(to)
  const source = mediaSource(mediaUrl)
  const caption = body || undefined
  const kind = mediaType || 'document'

  try {
    if (kind === 'image') {
      await sock.sendMessage(jid, { image: source, caption })
    } else if (kind === 'video') {
      await sock.sendMessage(jid, { video: source, caption })
    } else if (kind === 'audio') {
      await sock.sendMessage(jid, { audio: source, mimetype: 'audio/ogg; codecs=opus', ptt: false })
      if (body) await sock.sendMessage(jid, { text: body })
    } else {
      await sock.sendMessage(jid, {
        document: source,
        fileName: mediaName || path.basename(mediaUrl),
        mimetype: 'application/octet-stream',
        caption,
      })
    }
    return jid
  } catch (error) {
    global.__waStatus = 'disconnected'
    global.__waSock = null
    scheduleReconnect()
    throw error
  }
}
