import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureWhatsAppReady } from '@/lib/whatsapp'
import { ensureWAMediaDir } from '@/lib/wa-media'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sock = await ensureWhatsAppReady().catch(error => {
    console.error('[WhatsApp] send media ensure error:', error)
    return null
  })
  if (!sock) return NextResponse.json({ error: 'WhatsApp no conectado' }, { status: 400 })

  const form = await req.formData()
  const to = form.get('to') as string
  const caption = (form.get('caption') as string) || ''
  const file = form.get('file') as File
  const contactId = form.get('contactId') as string | null
  const ptt = form.get('ptt') === 'true'

  if (!to || !file) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (String(to).endsWith('@g.us')) {
    return NextResponse.json({ error: 'No se permite enviar archivos a grupos.' }, { status: 400 })
  }

  let digits = to.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) digits = `593${digits.slice(1)}`
  const jid = to.includes('@') ? to : `${digits}@s.whatsapp.net`
  const bytes = Buffer.from(await file.arrayBuffer())
  const mime = file.type
  const name = file.name
  const shouldSendRecordedAudioAsDocument = ptt && mime.startsWith('audio/') && !mime.includes('ogg')

  let sentMsg: any
  let sentAsDocument = shouldSendRecordedAudioAsDocument
  try {
    if (mime.startsWith('image/')) {
      sentMsg = await sock.sendMessage(jid, { image: bytes, caption, mimetype: mime })
    } else if (shouldSendRecordedAudioAsDocument) {
      sentMsg = await sock.sendMessage(jid, {
        document: bytes,
        mimetype: mime || 'audio/webm',
        fileName: name,
        caption: caption || 'Audio grabado',
      })
    } else if (mime.startsWith('audio/')) {
      sentMsg = await sock.sendMessage(jid, { audio: bytes, mimetype: mime || 'audio/ogg; codecs=opus', ptt })
    } else if (mime.startsWith('video/')) {
      sentMsg = await sock.sendMessage(jid, { video: bytes, caption, mimetype: mime })
    } else {
      sentMsg = await sock.sendMessage(jid, { document: bytes, mimetype: mime, fileName: name, caption })
    }
  } catch (error) {
    console.error('[WhatsApp] send media error:', error)
    if (!mime.startsWith('audio/')) {
      return NextResponse.json({ error: 'WhatsApp rechazó el archivo. Intenta enviarlo de nuevo.' }, { status: 500 })
    }
    try {
      sentMsg = await sock.sendMessage(jid, {
        document: bytes,
        mimetype: mime || 'audio/webm',
        fileName: name,
        caption: caption || 'Audio grabado',
      })
      sentAsDocument = true
    } catch (fallbackError) {
      console.error('[WhatsApp] send audio fallback error:', fallbackError)
      return NextResponse.json({ error: 'WhatsApp rechazó el audio. Intenta grabar de nuevo o adjuntarlo como archivo.' }, { status: 500 })
    }
  }

  // Save media to disk
  const mediaDir = ensureWAMediaDir()
  const ext = name.split('.').pop() || 'bin'
  const filename = `${sentMsg?.key?.id ?? Date.now()}.${ext}`
  fs.writeFileSync(path.join(mediaDir, filename), bytes)
  const mediaUrl = `/wa-media/${filename}`
  const mediaType = sentAsDocument ? 'document' : mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'document'

  const messageId = sentMsg?.key?.id ?? `sent-${Date.now()}`
  await prisma.whatsAppMessage.upsert({
    where: { messageId },
    update: {
      remoteJid: jid, fromMe: true,
      content: caption || name,
      timestamp: new Date(),
      mediaUrl, mediaType,
      contactId: contactId || null,
    },
    create: {
      remoteJid: jid, fromMe: true,
      content: caption || name,
      messageId,
      timestamp: new Date(),
      mediaUrl, mediaType,
      contactId: contactId || null,
    },
  }).catch(error => {
    console.error('[WhatsApp] sent media persistence failed:', error)
    throw error
  })

  return NextResponse.json({ ok: true, messageId })
}
