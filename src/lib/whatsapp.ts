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

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

declare global {
  var __waSock: ReturnType<typeof makeWASocket> | null
  var __waQr: string | null
  var __waStatus: 'disconnected' | 'connecting' | 'connected'
  var __waStartPromise: Promise<void> | null
  var __waSupervisor: ReturnType<typeof setInterval> | null
  var __waLoggedOut: boolean
  var __waLastOpenAt: number
  var __waLastReconnectAt: number
}

if (!global.__waStatus) global.__waStatus = 'disconnected'
if (global.__waQr === undefined) global.__waQr = null
if (global.__waSock === undefined) global.__waSock = null
if (global.__waStartPromise === undefined) global.__waStartPromise = null
if (global.__waSupervisor === undefined) global.__waSupervisor = null
if (global.__waLoggedOut === undefined) global.__waLoggedOut = false
if (global.__waLastOpenAt === undefined) global.__waLastOpenAt = 0
if (global.__waLastReconnectAt === undefined) global.__waLastReconnectAt = 0

export function getWAStatus() { return { status: global.__waStatus, qrCode: global.__waQr } }

function hasSavedWhatsAppSession() {
  return fs.existsSync(path.join(AUTH_DIR, 'creds.json'))
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForWAConnected(timeoutMs = 15000) {
  const startedAt = Date.now()
  while (global.__waStatus === 'connecting' && Date.now() - startedAt < timeoutMs) {
    await wait(500)
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

export async function startWhatsApp(options: { manual?: boolean } = {}) {
  if (options.manual) global.__waLoggedOut = false
  if (global.__waLoggedOut && !options.manual) return
  if (global.__waStatus === 'connecting' || global.__waStatus === 'connected') return
  if (global.__waStartPromise) return global.__waStartPromise

  global.__waStartPromise = startWhatsAppInternal().finally(() => {
    global.__waStartPromise = null
  })
  return global.__waStartPromise
}

async function startWhatsAppInternal() {
  global.__waStatus = 'connecting'
  global.__waQr = null

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
      browser: ['GTL Rate', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    })
    global.__waSock = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('lid-mapping.update' as any, async ({ lid, pn }: { lid: string; pn: string }) => {
      if (!lid || !pn) return
      await prisma.waConversation.updateMany({
        where: { remoteJid: lid },
        data: { phoneJid: pn },
      }).catch(() => {})
      await prisma.whatsAppMessage.updateMany({
        where: { remoteJid: lid },
        data: { phoneJid: pn },
      }).catch(() => {})
    })

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) { global.__waQr = qr; global.__waStatus = 'connecting' }
      if (connection === 'open') {
        global.__waQr = null
        global.__waStatus = 'connected'
        global.__waLastOpenAt = Date.now()
      }
      if (connection === 'close') {
        global.__waStatus = 'disconnected'
        global.__waSock = null
        global.__waQr = null
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        if (code === DisconnectReason.loggedOut) {
          global.__waLoggedOut = true
          return
        }
        scheduleWhatsAppReconnect(5000)
      }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message) continue
        const jid = msg.key.remoteJid!
        if (jid.includes('status@broadcast') || jid.includes('@broadcast')) continue
        const phoneJid = getPhoneJidFromMessage(msg)
        const phone = phoneFromJid(phoneJid) ?? phoneFromJid(jid) ?? jid.replace('@g.us', '').replace('@lid', '')
        const pushName = msg.pushName || null
        const fromMe = msg.key.fromMe ?? false
        const msgType = Object.keys(msg.message)[0]
        const isMedia = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'].includes(msgType)

        let content = msg.message.conversation
          || msg.message.extendedTextMessage?.text
          || msg.message.imageMessage?.caption
          || msg.message.videoMessage?.caption
          || msg.message.documentMessage?.fileName
          || `[${msgType.replace('Message', '')}]`

        let mediaData: { mediaUrl: string; mediaType: string } | null = null
        if (isMedia) mediaData = await saveMedia(msg, msgType, msg.key.id!)

        // Auto-create or find contact from pushName
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
            remoteJid: jid, fromMe, content,
            phoneJid,
            messageId: msg.key.id!,
            timestamp: new Date(Number(msg.messageTimestamp) * 1000),
            contactId: contact?.id ?? null,
            mediaUrl: mediaData?.mediaUrl ?? null,
            mediaType: mediaData?.mediaType ?? null,
            waName: pushName,
          },
        }).catch(() => {})

        // Track unread count for incoming messages
        if (!fromMe) {
          await prisma.waConversation.upsert({
            where: { remoteJid: jid },
            create: { remoteJid: jid, phoneJid, unreadCount: 1, status: 'OPEN' },
            update: { unreadCount: { increment: 1 }, status: 'OPEN', ...(phoneJid ? { phoneJid } : {}) },
          }).catch(() => {})
        }
      }
    })
  } catch (err) {
    console.error('[WhatsApp] startWhatsApp error:', err)
    global.__waStatus = 'disconnected'
  }
}

export function ensureWhatsAppSupervisor() {
  if (!global.__waSupervisor) {
    global.__waSupervisor = setInterval(() => {
      if (global.__waLoggedOut || !hasSavedWhatsAppSession()) return
      if (global.__waStatus === 'disconnected') {
        startWhatsApp().catch(error => console.error('[WhatsApp] supervisor restart failed:', error))
      }
    }, 15000)
  }

  if (global.__waStatus === 'disconnected' && hasSavedWhatsAppSession() && !global.__waLoggedOut) {
    startWhatsApp().catch(error => console.error('[WhatsApp] supervisor start failed:', error))
  }
}

export async function ensureWhatsAppReady() {
  if (global.__waStatus !== 'connected') {
    await startWhatsApp()
    await waitForWAConnected()
  }
  if (!global.__waSock || global.__waStatus !== 'connected') throw new Error('WhatsApp no conectado')
}

function scheduleWhatsAppReconnect(delayMs = 5000) {
  if (!hasSavedWhatsAppSession() || global.__waLoggedOut) return
  const now = Date.now()
  if (now - global.__waLastReconnectAt < 3000) return
  global.__waLastReconnectAt = now
  setTimeout(() => {
    if (global.__waStatus !== 'connected' && hasSavedWhatsAppSession() && !global.__waLoggedOut) {
      startWhatsApp().catch(error => console.error('[WhatsApp] reconnect failed:', error))
    }
  }, delayMs)
}

function markWhatsAppSendFailure(error: unknown) {
  console.error('[WhatsApp] send failed:', error)
  global.__waStatus = 'disconnected'
  global.__waSock = null
  scheduleWhatsAppReconnect(3000)
}

export async function sendWAMessage(to: string, body: string) {
  await ensureWhatsAppReady()
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  try {
    await global.__waSock!.sendMessage(jid, { text: body })
  } catch (error) {
    markWhatsAppSendFailure(error)
    throw error
  }
  return jid
}

export async function sendWAMediaMessage(opts: {
  to: string
  filePath: string
  mimeType: string
  fileName: string
  caption?: string
}) {
  await ensureWhatsAppReady()
  const jid = opts.to.includes('@') ? opts.to : `${opts.to}@s.whatsapp.net`
  const bytes = fs.readFileSync(opts.filePath)

  try {
    if (opts.mimeType.startsWith('image/')) {
      await global.__waSock!.sendMessage(jid, { image: bytes, caption: opts.caption, mimetype: opts.mimeType })
    } else if (opts.mimeType.startsWith('video/')) {
      await global.__waSock!.sendMessage(jid, { video: bytes, caption: opts.caption, mimetype: opts.mimeType })
    } else if (opts.mimeType.startsWith('audio/')) {
      await global.__waSock!.sendMessage(jid, { audio: bytes, mimetype: opts.mimeType })
      if (opts.caption) await global.__waSock!.sendMessage(jid, { text: opts.caption })
    } else {
      await global.__waSock!.sendMessage(jid, { document: bytes, mimetype: opts.mimeType, fileName: opts.fileName, caption: opts.caption })
    }
  } catch (error) {
    markWhatsAppSendFailure(error)
    throw error
  }

  return jid
}
