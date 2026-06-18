import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import { prisma } from './prisma'

const AUTH_DIR = path.join(process.cwd(), '.wa-auth')

let sock: ReturnType<typeof makeWASocket> | null = null
let qrCode: string | null = null
let status: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

export function getWAStatus() { return { status, qrCode } }

export async function startWhatsApp() {
  if (status === 'connected') return
  status = 'connecting'

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) { qrCode = qr; status = 'connecting' }
    if (connection === 'open') { qrCode = null; status = 'connected' }
    if (connection === 'close') {
      status = 'disconnected'
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) startWhatsApp()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue
      const jid = msg.key.remoteJid!
      const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
      const content =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '[media]'
      const contact = await prisma.contact.findFirst({
        where: { phone: { contains: phone.slice(-8) } },
      })
      await prisma.whatsAppMessage.create({
        data: {
          remoteJid: jid,
          fromMe: false,
          content,
          messageId: msg.key.id!,
          timestamp: new Date(Number(msg.messageTimestamp) * 1000),
          contactId: contact?.id ?? null,
        },
      })
    }
  })
}

export async function sendWAMessage(to: string, body: string) {
  if (!sock || status !== 'connected') throw new Error('WhatsApp no conectado')
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { text: body })
  return jid
}

export { sock }
