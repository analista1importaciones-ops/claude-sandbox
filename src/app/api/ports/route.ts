import { NextResponse } from 'next/server'
import { COMMON_PORTS } from '@/lib/rateStatus'

export async function GET() {
  return NextResponse.json(COMMON_PORTS)
}
