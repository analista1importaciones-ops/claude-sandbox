import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

const MEDIA_DIR = path.join(process.cwd(), 'public', 'workflow-media')

async function templateDataFromRequest(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    const body = await req.json()
    return { name: body.name, body: body.body }
  }

  const form = await req.formData()
  const name = String(form.get('name') || '')
  const body = String(form.get('body') || '')
  const file = form.get('file') as File | null
  const removeMedia = form.get('removeMedia') === 'true'

  if (!file || file.size === 0) return { name, body, ...(removeMedia ? { mediaUrl: null, mediaType: null, mediaName: null } : {}) }

  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })
  const ext = file.name.split('.').pop() || 'bin'
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(MEDIA_DIR, filename), bytes)

  return {
    name,
    body,
    mediaUrl: `/workflow-media/${filename}`,
    mediaType: file.type || 'application/octet-stream',
    mediaName: file.name,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const templates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await templateDataFromRequest(req)
  const t = await prisma.whatsAppTemplate.create({ data })
  return NextResponse.json(t)
}
