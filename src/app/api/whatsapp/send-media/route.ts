import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { __waSock, __waStatus } = global as any
  if (!__waSock || __waStatus !== 'connected') return NextResponse.json({ error: 'WhatsApp no conectado' }, { status: 400 })

  const form = await req.formData()
  const to = form.get('to') as string
  const caption = (form.get('caption') as string) || ''
  const file = form.get('file') as File

  if (!to || !file) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  const bytes = Buffer.from(await file.arrayBuffer())
  const mime = file.type
  const name = file.name

  let sentMsg: any
  if (mime.startsWith('image/')) {
    sentMsg = await __waSock.sendMessage(jid, { image: bytes, caption, mimetype: mime })
  } else if (mime.startsWith('audio/')) {
    sentMsg = await __waSock.sendMessage(jid, { audio: bytes, mimetype: 'audio/ogg; codecs=opus', ptt: true })
  } else if (mime.startsWith('video/')) {
    sentMsg = await __waSock.sendMessage(jid, { video: bytes, caption, mimetype: mime })
  } else {
    sentMsg = await __waSock.sendMessage(jid, { document: bytes, mimetype: mime, fileName: name, caption })
  }

  // Save media to disk
  const MEDIA_DIR = path.join(process.cwd(), 'public', 'wa-media')
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })
  const ext = name.split('.').pop() || 'bin'
  const filename = `${sentMsg?.key?.id ?? Date.now()}.${ext}`
  fs.writeFileSync(path.join(MEDIA_DIR, filename), bytes)
  const mediaUrl = `/wa-media/${filename}`
  const mediaType = mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'document'

  await prisma.whatsAppMessage.create({
    data: {
      remoteJid: jid, fromMe: true,
      content: caption || name,
      messageId: sentMsg?.key?.id ?? `sent-${Date.now()}`,
      timestamp: new Date(),
      mediaUrl, mediaType,
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
