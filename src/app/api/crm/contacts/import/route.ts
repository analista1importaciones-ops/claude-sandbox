import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const text = await req.text()
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV vacío o sin datos' }, { status: 400 })

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-záéíóúñ]/gi, ''))

  const idx = (names) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n))
      if (i !== -1) return i
    }
    return -1
  }

  const nameIdx = idx(['nombre', 'name'])
  const companyIdx = idx(['empresa', 'company'])
  const emailIdx = idx(['email', 'correo'])
  const phoneIdx = idx(['telefono', 'phone', 'tel'])

  if (nameIdx === -1) return NextResponse.json({ error: 'Columna "nombre" requerida' }, { status: 400 })

  let created = 0
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const name = cols[nameIdx]
    if (!name) continue
    await prisma.contact.create({
      data: {
        name,
        company: companyIdx !== -1 ? cols[companyIdx] || null : null,
        email: emailIdx !== -1 ? cols[emailIdx] || null : null,
        phone: phoneIdx !== -1 ? cols[phoneIdx] || null : null,
        source: 'OTRO',
        serviceLabel: 'OTRO',
      },
    })
    created++
  }

  return NextResponse.json({ created })
}
