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

const AUTH_DIR = path.join(process.cwd(), '.wa-auth')
const MEDIA_DIR = path.join(process.cwd(), 'public', 'wa-media')
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })

declare global {
  var __waSock: ReturnType<typeof makeWASocket> | null
  var __waQr: string | null
  var __waStatus: 'disconnected' | 'connecting' | 'connected'
}

if (!global.__waStatus) global.__waStatus = 'disconnected'
if (global.__waQr === undefined) global.__waQr = null
if (global.__waSock === undefined) global.__waSock = null

export function getWAStatus() { return { status: global.__waStatus, qrCode: global.__waQr } }

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

async function saveMedia(msg: any, msgType: string, messageId: string): Promise<{ mediaUrl: string; mediaType: string } | null> {
  try {
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

export async function startWhatsApp() {
  if (global.__waStatus === 'connecting' || global.__waStatus === 'connected') return
  global.__waStatus = 'connecting'
  global.__waQr = null

  try {
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

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) { global.__waQr = qr; global.__waStatus = 'connecting' }
      if (connection === 'open') { global.__waQr = null; global.__waStatus = 'connected' }
      if (connection === 'close') {
        global.__waStatus = 'disconnected'
        global.__waQr = null
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        if (code !== DisconnectReason.loggedOut) startWhatsApp()
      }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message) continue
        const jid = msg.key.remoteJid!
        if (jid.includes('status@broadcast') || jid.includes('@broadcast')) continue
        const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
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
        if (!contact && !fromMe && pushName && jid.endsWith('@s.whatsapp.net')) {
          contact = await prisma.contact.create({
            data: { name: pushName, phone, waName: pushName, source: 'OTRO', serviceLabel: 'OTRO', tags: [] },
          }).catch(() => null)
        } else if (contact && pushName && !contact.waName) {
          await prisma.contact.update({ where: { id: contact.id }, data: { waName: pushName } }).catch(() => {})
        }

        await prisma.whatsAppMessage.create({
          data: {
            remoteJid: jid, fromMe, content,
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
            create: { remoteJid: jid, unreadCount: 1, status: 'OPEN' },
            update: { unreadCount: { increment: 1 }, status: 'OPEN' },
          }).catch(() => {})
        }
      }
    })
  } catch (err) {
    console.error('[WhatsApp] startWhatsApp error:', err)
    global.__waStatus = 'disconnected'
  }
}

export async function sendWAMessage(to: string, body: string) {
  if (!global.__waSock || global.__waStatus !== 'connected') throw new Error('WhatsApp no conectado')
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await global.__waSock.sendMessage(jid, { text: body })
  return jid
}
