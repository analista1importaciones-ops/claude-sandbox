type CRMMessageInput = {
  contactName: string
  company?: string | null
  phone?: string | null
  stage?: string | null
  trigger?: string | null
  recentMessages?: string[]
}

function extractOutputText(data: any) {
  if (typeof data.output_text === 'string') return data.output_text
  const parts = data.output
    ?.flatMap((item: any) => item.content ?? [])
    ?.map((content: any) => content.text)
    ?.filter(Boolean)
  return parts?.join('\n') ?? ''
}

export async function generateCRMWhatsAppMessage(input: CRMMessageInput) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')

  const model = process.env.OPENAI_MODEL ?? 'gpt-5.5'
  const prompt = [
    'Redacta un mensaje breve de WhatsApp para un cliente de Global Trade Logistics.',
    'Tono: profesional, cercano, directo, español latino.',
    'Reglas: no inventes precios, fechas, descuentos, tracking, promesas ni datos que no estén en el contexto.',
    'No uses emojis excesivos. Máximo 420 caracteres. No incluyas saludo si no aporta.',
    '',
    `Cliente: ${input.contactName}`,
    input.company ? `Empresa: ${input.company}` : '',
    input.phone ? `Teléfono: ${input.phone}` : '',
    input.stage ? `Etapa CRM: ${input.stage}` : '',
    input.trigger ? `Disparador: ${input.trigger}` : '',
    input.recentMessages?.length ? `Mensajes recientes:\n${input.recentMessages.join('\n')}` : '',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI no generó el mensaje (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = extractOutputText(data).trim()
  if (!text) throw new Error('OpenAI devolvió un mensaje vacío')
  return text
}
