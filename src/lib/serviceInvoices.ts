export const SERVICE_INVOICE_IVA_RATE = 0.15

export type ServiceInvoiceItemInput = {
  description?: string
  quantity?: number | string
  unitPrice?: number | string
  appliesIva?: boolean
}

export function normalizeServiceInvoiceItems(items: ServiceInvoiceItemInput[]) {
  return items
    .map(item => ({
      description: String(item.description ?? '').trim(),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      appliesIva: Boolean(item.appliesIva),
    }))
    .filter(item => item.description && item.quantity > 0)
}

export function calculateServiceInvoiceTotals(items: ReturnType<typeof normalizeServiceInvoiceItems>) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const ivaTotal = items.reduce((sum, item) => sum + (item.appliesIva ? item.quantity * item.unitPrice * SERVICE_INVOICE_IVA_RATE : 0), 0)
  return { subtotal, ivaTotal, total: subtotal + ivaTotal }
}
