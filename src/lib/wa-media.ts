import fs from 'fs'
import path from 'path'

export function getWAMediaDir() {
  return process.env.WA_MEDIA_DIR || path.join(process.cwd(), 'public', 'wa-media')
}

export function ensureWAMediaDir() {
  const dir = getWAMediaDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getWAMediaPath(filename: string) {
  const safeName = path.basename(filename)
  return path.join(getWAMediaDir(), safeName)
}

export function getWAMediaSource(mediaUrl: string) {
  if (/^https?:\/\//i.test(mediaUrl)) return { url: mediaUrl }
  const clean = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl
  if (clean.startsWith('wa-media/')) return { url: getWAMediaPath(clean.replace('wa-media/', '')) }
  return { url: path.join(process.cwd(), 'public', clean) }
}

export function getWAMediaMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.ogg' || ext === '.oga') return 'audio/ogg'
  if (ext === '.webm') return 'audio/webm'
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4'
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}
