import {
  Document, Image, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import { PAYMENT_ACCOUNTS, PAYMENT_RECEIPT_EMAIL } from '@/lib/paymentAccounts'

const NAVY = '#0d2d6b'
const BLUE = '#1a56db'
const ORANGE = '#e36b0c'
const LIGHT_GRAY = '#f0f4ff'
const BORDER = '#c7d7f5'
const GTL_LOGO = `${process.cwd()}/public/logo.jpg`
const AURIGA_LOGO = `${process.cwd()}/public/auriga-logo.jpeg`

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: '22 38 28 38', backgroundColor: '#ffffff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: NAVY },
  logoBlock: { flexDirection: 'column' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: { width: 86, height: 48, objectFit: 'contain' },
  aurigaImage: { width: 70, height: 48, objectFit: 'contain' },
  logoSub: { fontSize: 7.5, color: '#64748b', marginTop: 2 },
  invoiceInfo: { alignItems: 'flex-end' },
  invoiceLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  invoiceTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  invoiceNumber: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLUE },
  invoiceDate: { fontSize: 8, color: '#475569', marginTop: 3 },

  // Meta boxes
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaBox: { flex: 1, backgroundColor: LIGHT_GRAY, borderRadius: 4, padding: '7 10', borderWidth: 1, borderColor: BORDER },
  metaLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  metaSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  metaBlankLine: { fontSize: 8, color: '#64748b', marginTop: 4, borderBottomWidth: 1, borderBottomColor: '#94a3b8', paddingBottom: 1 },

  // Tables
  section: { marginBottom: 9 },
  sectionHeaderRow: { flexDirection: 'row', backgroundColor: NAVY, padding: '4 10' },
  sectionHeaderText: { fontSize: 7.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden', marginTop: 2 },
  tableHead: { flexDirection: 'row', backgroundColor: '#e8edf7', padding: '4 10' },
  tableHeadText: { fontSize: 7.5, color: NAVY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '4 10', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: LIGHT_GRAY },
  tableCell: { flex: 1, fontSize: 8.5, color: '#334155' },
  tableCellRight: { width: 90, fontSize: 8.5, color: '#0f172a', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  subtotalRow: { flexDirection: 'row', padding: '4 10', backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe' },
  subtotalLabel: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY },
  subtotalValue: { width: 90, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },

  // Grand total
  totalRow: { flexDirection: 'row', padding: '7 10', backgroundColor: NAVY },
  totalLabel: { flex: 1, fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { width: 90, fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // Payment conditions
  conditions: { backgroundColor: LIGHT_GRAY, borderRadius: 4, borderWidth: 1, borderLeftWidth: 3, borderColor: BORDER, borderLeftColor: NAVY, padding: '7 10', marginTop: 10, marginBottom: 8 },
  condTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', marginBottom: 5 },
  condText: { fontSize: 8, color: '#334155', lineHeight: 1.4 },
  paymentBox: { marginTop: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  paymentHeader: { backgroundColor: NAVY, padding: '5 9' },
  paymentHeaderText: { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  paymentRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  paymentAccount: { flex: 1, padding: '7 9' },
  paymentTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  paymentText: { fontSize: 7.8, color: '#334155', lineHeight: 1.35 },
  receiptText: { fontSize: 8, color: ORANGE, fontFamily: 'Helvetica-Bold', padding: '6 9', backgroundColor: '#fff7ed' },

  // Footer
  footer: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6, marginTop: 10, flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

type LineItem = { label: string; amount: number }

interface ProformaInvoicePdfProps {
  number: string
  issueDate: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  originPort: string
  destinationPort: string
  mode: string
  incoterm: string
  cbm?: number | null
  containers?: number | null
  intlCharges: LineItem[]
  localCharges: LineItem[]
  otherCharges: LineItem[]
  intlTotal: number
  localTotal: number
  otherTotal: number
  grandTotal: number
}

const modeLabel: Record<string, string> = {
  LCL: 'LCL (Carga Consolidada)', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

function fmt(value: number | string | null | undefined) {
  const amount = Number(value ?? 0)
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`
}

function ChargesBlock({ blockTitle, items, subtotalLabel, subtotal }: {
  blockTitle: string; items: LineItem[]; subtotalLabel: string; subtotal: number
}) {
  if (items.length === 0) return null
  return (
    <View style={s.section}>
      <View style={s.table}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionHeaderText, { flex: 1 }]}>{blockTitle}</Text>
        </View>
        <View style={s.tableHead}>
          <Text style={[s.tableHeadText, { flex: 1 }]}>Descripción</Text>
          <Text style={[s.tableHeadText, { width: 90, textAlign: 'right' }]}>Monto USD</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.tableCell}>{item.label}</Text>
            <Text style={s.tableCellRight}>{fmt(item.amount)}</Text>
          </View>
        ))}
        <View style={s.subtotalRow}>
          <Text style={s.subtotalLabel}>{subtotalLabel}</Text>
          <Text style={s.subtotalValue}>{fmt(subtotal)}</Text>
        </View>
      </View>
    </View>
  )
}

export default function ProformaInvoicePdf(props: ProformaInvoicePdfProps) {
  const proformaNumber = `PF-${props.number}`
  const qty = props.cbm
    ? `${props.cbm} CBM`
    : props.containers
      ? `${props.containers} contenedor${props.containers !== 1 ? 'es' : ''}`
      : ''

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <View style={s.logoRow}>
              <Image src={GTL_LOGO} style={s.logoImage} />
              <Image src={AURIGA_LOGO} style={s.aurigaImage} />
            </View>
            <Text style={s.logoSub}>Global Trade Logistics S.A.S.</Text>
          </View>
          <View style={s.invoiceInfo}>
            <Text style={s.invoiceLabel}>Documento de Cobro</Text>
            <Text style={s.invoiceTitle}>PROFORMA DE COBRO</Text>
            <Text style={s.invoiceNumber}>{proformaNumber}</Text>
            <Text style={s.invoiceDate}>
              Fecha de emisión:{' '}
              {new Date(props.issueDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Client + Shipment boxes */}
        <View style={s.metaRow}>
          {/* Client box */}
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Datos del Cliente</Text>
            <Text style={s.metaValue}>{props.customerName}</Text>
            <Text style={[s.metaSub, { marginTop: 6 }]}>RUC / Cédula:</Text>
            <Text style={s.metaBlankLine}>{' '}</Text>
            <Text style={[s.metaSub, { marginTop: 4 }]}>Dirección:</Text>
            <Text style={s.metaBlankLine}>{' '}</Text>
            <Text style={[s.metaSub, { marginTop: 4 }]}>Teléfono:</Text>
            <Text style={s.metaBlankLine}>{' '}</Text>
          </View>

          {/* Shipment summary box */}
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Resumen del Embarque</Text>
            <Text style={s.metaSub}>Ruta:</Text>
            <Text style={s.metaValue}>{props.originPort} → {props.destinationPort}</Text>
            <Text style={[s.metaSub, { marginTop: 5 }]}>Modalidad:</Text>
            <Text style={[s.metaValue, { marginTop: 1 }]}>{modeLabel[props.mode] ?? props.mode}</Text>
            <Text style={[s.metaSub, { marginTop: 5 }]}>Incoterm:</Text>
            <Text style={[s.metaValue, { marginTop: 1 }]}>{props.incoterm}</Text>
            {qty !== '' && (
              <>
                <Text style={[s.metaSub, { marginTop: 5 }]}>CBM / Contenedores:</Text>
                <Text style={[s.metaValue, { marginTop: 1 }]}>{qty}</Text>
              </>
            )}
          </View>
        </View>

        {/* Charges blocks */}
        <ChargesBlock
          blockTitle="Bloque 1 — Transporte Internacional"
          items={props.intlCharges}
          subtotalLabel="Subtotal Transporte Internacional"
          subtotal={props.intlTotal}
        />
        <ChargesBlock
          blockTitle="Bloque 2 — Gastos Locales GTL"
          items={props.localCharges}
          subtotalLabel="Subtotal Gastos Locales"
          subtotal={props.localTotal}
        />
        <ChargesBlock
          blockTitle="Bloque 3 — Costos en Destino"
          items={props.otherCharges}
          subtotalLabel="Subtotal Costos en Destino"
          subtotal={props.otherTotal}
        />

        {/* Grand Total */}
        <View style={{ borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total General</Text>
            <Text style={s.totalValue}>{fmt(props.grandTotal)}</Text>
          </View>
        </View>

        {/* Payment conditions */}
        <View style={s.conditions}>
          <Text style={s.condTitle}>Condiciones de Pago</Text>
          <Text style={s.condText}>
            Los valores indicados deben cancelarse según avance de la operación.
            Consulte a su ejecutivo de cuenta para información de pago.
          </Text>
        </View>

        <View style={s.paymentBox}>
          <View style={s.paymentHeader}>
            <Text style={s.paymentHeaderText}>Datos para el pago</Text>
          </View>
          <View style={s.paymentRow}>
            {PAYMENT_ACCOUNTS.map(account => (
              <View key={account.accountNumber} style={s.paymentAccount}>
                <Text style={s.paymentTitle}>{account.bank}</Text>
                <Text style={s.paymentText}>{account.accountType}</Text>
                <Text style={s.paymentText}>Cuenta: {account.accountNumber}</Text>
                <Text style={s.paymentText}>Titular: {account.beneficiary}</Text>
                {account.taxId && <Text style={s.paymentText}>RUC: {account.taxId}</Text>}
              </View>
            ))}
          </View>
          <Text style={s.receiptText}>Enviar comprobante a: {PAYMENT_RECEIPT_EMAIL}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>GTL Global Trade Logistics S.A.S. · Ecuador · www.gtl.ec</Text>
        </View>

      </Page>
    </Document>
  )
}
