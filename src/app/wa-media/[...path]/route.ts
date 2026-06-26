import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getWAMediaMimeType, getWAMediaPath } from '@/lib/wa-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const filename = path.basename(params.path.join('/'))
  if (!filename) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = getWAMediaPath(filename)
  let file: Buffer
  try {
    file = await fs.readFile(filePath)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const range = req.headers.get('range')
  const contentType = getWAMediaMimeType(filename)
  const baseHeaders = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/)
    const start = match?.[1] ? Number(match[1]) : 0
    const end = match?.[2] ? Number(match[2]) : file.length - 1
    if (Number.isNaN(start) || Number.isNaN(end) || start >= file.length || end >= file.length || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${file.length}`,
        },
      })
    }
    const chunk = file.subarray(start, end + 1)
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
      },
    })
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      ...baseHeaders,
      'Content-Length': String(file.length),
    },
  })
}
