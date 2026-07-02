import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureWAMediaDir } from '@/lib/wa-media'
import fs from 'fs'
import path from 'path'

const MAX_FILE_SIZE = 64 * 1024 * 1024

function mediaKind(mime: string) {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return 'document'
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Selecciona un archivo' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 64 MB' }, { status: 400 })
  }

  const originalName = file.name || 'archivo'
  const ext = path.extname(originalName).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 10) || '.bin'
  const filename = `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`
  fs.writeFileSync(path.join(ensureWAMediaDir(), filename), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({
    mediaUrl: `/wa-media/${filename}`,
    mediaType: mediaKind(file.type),
    mediaName: originalName,
  })
}
