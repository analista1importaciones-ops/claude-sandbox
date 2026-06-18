import { google } from 'googleapis'
import { prisma } from './prisma'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/google/callback'
  )
}

export function getAuthUrl() {
  const oauth2 = getOAuth2Client()
  return oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' })
}

export async function getAuthedClient() {
  const token = await prisma.googleToken.findFirst()
  if (!token) throw new Error('Google no conectado')
  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: Number(token.expiryDate),
  })
  return oauth2
}

export async function createCalendarEvent(opts: {
  title: string
  description?: string
  startAt: Date
  endAt: Date
  attendeeEmail?: string
}) {
  const auth = await getAuthedClient()
  const calendar = google.calendar({ version: 'v3', auth })
  const event = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: opts.attendeeEmail ? 'all' : 'none',
    requestBody: {
      summary: opts.title,
      description: opts.description,
      start: { dateTime: opts.startAt.toISOString() },
      end: { dateTime: opts.endAt.toISOString() },
      attendees: opts.attendeeEmail ? [{ email: opts.attendeeEmail }] : [],
    },
  })
  return event.data.id
}
