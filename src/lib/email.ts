const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'GTL Rate <noreply@gtl.ec>'

const STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada ✓',
  EN_TRANSITO: 'En Tránsito 🚢',
  ARRIBO: 'Arribo en Puerto',
  EN_ADUANA: 'En Proceso Aduanero',
  NACIONALIZACION: 'En Nacionalización',
  ENTREGADA: 'Entregada ✓',
  RECHAZADA: 'Rechazada',
}

const NOTIFY_STATUSES = new Set([
  'ENVIADA', 'APROBADA', 'EN_TRANSITO', 'ARRIBO',
  'EN_ADUANA', 'NACIONALIZACION', 'ENTREGADA', 'RECHAZADA',
])

export async function sendStatusEmail(params: {
  to: string
  customerName: string
  quotationNumber: string
  status: string
  originPort: string
  destinationPort: string
}) {
  if (!RESEND_API_KEY) return
  if (!NOTIFY_STATUSES.has(params.status)) return

  const statusLabel = STATUS_LABELS[params.status] ?? params.status

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0d2d6b;padding:24px 32px;border-radius:8px 8px 0 0;">
        <span style="color:white;font-size:24px;font-weight:bold;">GTL</span>
        <span style="color:#e36b0c;font-size:24px;font-weight:bold;"> Rate</span>
        <div style="color:#93c5fd;font-size:12px;margin-top:2px;">Global Trade Logistics</div>
      </div>
      <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:16px;">Estimado/a <strong>${params.customerName}</strong>,</p>
        <p style="color:#374151;">Le informamos que el estado de su cotización ha sido actualizado:</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
          <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Cotización</div>
          <div style="color:#0d2d6b;font-size:20px;font-weight:bold;font-family:monospace;margin:4px 0;">${params.quotationNumber}</div>
          <div style="color:#6b7280;font-size:13px;">${params.originPort} → ${params.destinationPort}</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9;">
            <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Estado actual</div>
            <div style="color:#0d2d6b;font-size:18px;font-weight:bold;margin-top:4px;">${statusLabel}</div>
          </div>
        </div>
        <p style="color:#6b7280;font-size:13px;">Para consultas, comuníquese con su ejecutivo de cuenta GTL.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
          GTL Global Trade Logistics S.A.S · Ecuador
        </p>
      </div>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      subject: `[GTL] Actualización cotización ${params.quotationNumber} — ${statusLabel}`,
      html,
    }),
  }).catch(() => {})
}

export async function sendAppointmentEmail(params: {
  to: string
  title: string
  description?: string | null
  startAt: Date
  endAt: Date
  contactName?: string | null
  internal?: boolean
}) {
  if (!RESEND_API_KEY) return

  const start = params.startAt.toLocaleString('es-EC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Guayaquil' })
  const end = params.endAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })
  const greeting = params.internal ? 'Nueva cita agendada' : `Hola${params.contactName ? ` ${params.contactName}` : ''}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0d2d6b;padding:24px 32px;border-radius:8px 8px 0 0;">
        <span style="color:white;font-size:24px;font-weight:bold;">GTL</span>
        <span style="color:#e36b0c;font-size:24px;font-weight:bold;"> Logistics</span>
      </div>
      <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:16px;"><strong>${greeting}</strong></p>
        <p style="color:#374151;">${params.internal ? 'Se registró una cita en el CRM:' : 'Te confirmamos tu cita:'}</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
          <div style="color:#0d2d6b;font-size:20px;font-weight:bold;">${params.title}</div>
          <div style="color:#374151;margin-top:8px;">${start} - ${end}</div>
          ${params.description ? `<div style="color:#6b7280;margin-top:12px;">${params.description}</div>` : ''}
        </div>
        <p style="color:#6b7280;font-size:13px;">GTL Global Trade Logistics S.A.S</p>
      </div>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      subject: `[GTL] Cita: ${params.title}`,
      html,
    }),
  }).catch(() => {})
}

export async function sendDocumentEmail(params: {
  to: string
  customerName: string
  subject: string
  documentLabel: string
  message: string
  filename: string
  pdf: Buffer | Uint8Array
}) {
  if (!RESEND_API_KEY) return false

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0d2d6b;padding:24px 32px;border-radius:8px 8px 0 0;">
        <span style="color:white;font-size:24px;font-weight:bold;">Global</span>
        <span style="color:#e36b0c;font-size:24px;font-weight:bold;"> Trade Logistic</span>
      </div>
      <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:16px;">Hola <strong>${params.customerName}</strong>,</p>
        <p style="color:#374151;">${params.message}</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
          <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Documento adjunto</div>
          <div style="color:#0d2d6b;font-size:20px;font-weight:bold;margin-top:4px;">${params.documentLabel}</div>
        </div>
        <p style="color:#6b7280;font-size:13px;">También encontrará los datos de pago dentro del documento.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
          GTL Global Trade Logistics S.A.S · Ecuador
        </p>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      subject: params.subject,
      html,
      attachments: [
        {
          filename: params.filename,
          content: Buffer.from(params.pdf).toString('base64'),
        },
      ],
    }),
  }).catch(() => null)

  return Boolean(res?.ok)
}
