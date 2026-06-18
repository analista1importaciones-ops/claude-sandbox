import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })
  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  await prisma.googleToken.deleteMany()
  await prisma.googleToken.create({
    data: { accessToken: tokens.access_token!, refreshToken: tokens.refresh_token!, expiryDate: BigInt(tokens.expiry_date ?? 0) },
  })
  return NextResponse.redirect(new URL('/settings?google=connected', req.url))
}
