import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { prisma } from './prisma'

const AUTH_DIR = path.join(process.cwd(), '.wa-auth')
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

declare global {
  var __waSock: ReturnType<typeof makeWASocket> | null
  var __waQr: string | null
  var __waStatus: 'disconnected' | 'connecting' | 'connected'
}

if (!global.__waStatus) global.__waStatus = 'disconnected'
if (global.__waQr === undefined) global.__waQr = null
if (global.__waSock === undefined) global.__waSock = null

export function getWAStatus() { return { status: global.__waStatus, qrCode: global.__waQr } }

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
        if (!msg.message || msg.key.fromMe) continue
        const jid = msg.key.remoteJid!
        const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '[media]'
        const contact = await prisma.contact.findFirst({ where: { phone: { contains: phone.slice(-8) } } })
        await prisma.whatsAppMessage.create({
          data: {
            remoteJid: jid, fromMe: false, content,
            messageId: msg.key.id!,
            timestamp: new Date(Number(msg.messageTimestamp) * 1000),
            contactId: contact?.id ?? null,
          },
        }).catch(() => {})
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
