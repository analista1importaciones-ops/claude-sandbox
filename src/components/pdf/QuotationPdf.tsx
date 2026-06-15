import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const NAVY = '#1e3a5f'
const ORANGE = '#f97316'
const LIGHT_GRAY = '#f8fafc'
const BORDER = '#e2e8f0'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: '30 40 40 40', backgroundColor: '#ffffff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: NAVY },
  logoBlock: { flexDirection: 'column' },
  logoName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.5 },
  logoSub: { fontSize: 7.5, color: '#64748b', marginTop: 2 },
  quoteInfo: { alignItems: 'flex-end' },
  quoteNumber: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: ORANGE },
  quoteLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  quoteDate: { fontSize: 8, color: '#475569', marginTop: 3 },

  // Client + route strip
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metaBox: { flex: 1, backgroundColor: LIGHT_GRAY, borderRadius: 4, padding: '10 12', borderWidth: 1, borderColor: BORDER },
  metaLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  metaSub: { fontSize: 8, color: '#64748b', marginTop: 2 },

  // Tables
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NAVY, marginRight: 6 },
  sectionTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: NAVY, padding: '5 10' },
  tableHeadText: { fontSize: 7.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '5 10', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: LIGHT_GRAY },
  tableCell: { flex: 1, fontSize: 8.5, color: '#334155' },
  tableCellRight: { width: 80, fontSize: 8.5, color: '#0f172a', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  subtotalRow: { flexDirection: 'row', padding: '6 10', backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe' },
  subtotalLabel: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY },
  subtotalValue: { width: 80, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },

  // Grand total
  totalBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, marginBottom: 16 },
  totalInner: { backgroundColor: NAVY, borderRadius: 6, padding: '10 16', flexDirection: 'row', alignItems: 'center', gap: 20, minWidth: 220 },
  totalLabel: { fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 14, color: ORANGE, fontFamily: 'Helvetica-Bold' },

  // Conditions + footer
  conditions: { backgroundColor: LIGHT_GRAY, borderRadius: 4, borderWidth: 1, borderColor: BORDER, padding: '8 12', marginBottom: 14 },
  condTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#475569', textTransform: 'uppercase', marginBottom: 5 },
  condItem: { fontSize: 7.5, color: '#64748b', marginBottom: 2 },
  footer: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7, color: '#94a3b8' },
  footerBold: { fontSize: 7, color: NAVY, fontFamily: 'Helvetica-Bold' },
})

type LineItem = { label: string; amount: number }

interface QuotationPdfProps {
  number: string
  issueDate: string
  validUntil: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  originPort: string
  destinationPort: string
  originCountry: string
  mode: string
  incoterm: string
  currency: string
  cbm?: number | null
  containers?: number | null
  transitDaysMin?: number | null
  transitDaysMax?: number | null
  frequency?: string | null
  productDesc?: string | null
  intlCharges: LineItem[]
  localCharges: LineItem[]
  otherCharges: LineItem[]
  intlTotal: number
  localTotal: number
  otherTotal: number
  grandTotal: number
  notes?: string | null
}

const modeLabel: Record<string, string> = {
  LCL: 'LCL (Carga Consolidada)', FCL20: 'FCL 20GP', FCL40: 'FCL 40GP', FCL40HC: 'FCL 40HQ', AIR: 'Aéreo',
}

function fmt(n: number) { return `$${n.toFixed(2)}` }

function LineTable({ title, dot, items, subtotalLabel, subtotal, currency }: {
  title: string; dot?: string; items: LineItem[]; subtotalLabel: string; subtotal: number; currency: string
}) {
  if (items.length === 0) return null
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, dot ? { backgroundColor: dot } : {}]} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.table}>
        <View style={s.tableHead}>
          <Text style={[s.tableHeadText, { flex: 1 }]}>Concepto</Text>
          <Text style={[s.tableHeadText, { width: 80, textAlign: 'right' }]}>{currency}</Text>
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

export default function QuotationPdf(props: QuotationPdfProps) {
  const qty = props.cbm ? `${props.cbm} CBM` : props.containers ? `${props.containers} contenedor${props.containers !== 1 ? 'es' : ''}` : ''

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <Text style={s.logoName}>GLOBAL TRADE LOGISTICS</Text>
            <Text style={s.logoSub}>Agente de Carga Internacional · Ecuador</Text>
            <Text style={s.logoSub}>analista1.importaciones@gmail.com · GTL S.A.S.</Text>
          </View>
          <View style={s.quoteInfo}>
            <Text style={s.quoteLabel}>Cotización de Flete</Text>
            <Text style={s.quoteNumber}>{props.number}</Text>
            <Text style={s.quoteDate}>Emisión: {new Date(props.issueDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
            <Text style={s.quoteDate}>Válida hasta: {new Date(props.validUntil).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* Client + Route */}
        <View style={s.metaRow}>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Cliente</Text>
            <Text style={s.metaValue}>{props.customerName}</Text>
            {props.customerEmail && <Text style={s.metaSub}>{props.customerEmail}</Text>}
            {props.customerPhone && <Text style={s.metaSub}>{props.customerPhone}</Text>}
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Ruta</Text>
            <Text style={s.metaValue}>{props.originPort} → {props.destinationPort}</Text>
            <Text style={s.metaSub}>{modeLabel[props.mode] ?? props.mode} · {props.incoterm}</Text>
            {qty && <Text style={s.metaSub}>Cantidad: {qty}</Text>}
            {props.productDesc && <Text style={s.metaSub}>Carga: {props.productDesc}</Text>}
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Tránsito</Text>
            {props.transitDaysMin && props.transitDaysMax
              ? <Text style={s.metaValue}>{props.transitDaysMin}–{props.transitDaysMax} días</Text>
              : <Text style={s.metaValue}>A confirmar</Text>}
            {props.frequency && <Text style={s.metaSub}>{props.frequency}</Text>}
            <Text style={s.metaSub}>Moneda: {props.currency}</Text>
          </View>
        </View>

        {/* Block 1 */}
        <LineTable
          title="Bloque 1 — Transporte Internacional"
          items={props.intlCharges}
          subtotalLabel="Subtotal Transporte Internacional"
          subtotal={props.intlTotal}
          currency={props.currency}
        />

        {/* Block 2 */}
        <LineTable
          title="Bloque 2 — Gastos Locales GTL"
          dot={ORANGE}
          items={props.localCharges}
          subtotalLabel="Subtotal Gastos Locales"
          subtotal={props.localTotal}
          currency={props.currency}
        />

        {/* Block 3 */}
        <LineTable
          title="Bloque 3 — Otros Costos"
          dot="#64748b"
          items={props.otherCharges}
          subtotalLabel="Subtotal Otros Costos"
          subtotal={props.otherTotal}
          currency={props.currency}
        />

        {/* Grand Total */}
        <View style={s.totalBox}>
          <View style={s.totalInner}>
            <Text style={s.totalLabel}>Total General</Text>
            <Text style={s.totalValue}>{fmt(props.grandTotal)}</Text>
          </View>
        </View>

        {/* Notes */}
        {props.notes && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[s.condTitle, { marginBottom: 3 }]}>Observaciones</Text>
            <Text style={[s.condItem, { color: '#334155' }]}>{props.notes}</Text>
          </View>
        )}

        {/* Conditions */}
        <View style={s.conditions}>
          <Text style={s.condTitle}>Condiciones Comerciales</Text>
          <Text style={s.condItem}>• Cotización válida hasta la fecha indicada, sujeta a disponibilidad de espacio y tarifas confirmadas por el agente.</Text>
          <Text style={s.condItem}>• Los valores de flete internacional están expresados en USD y pueden variar según fecha de embarque.</Text>
          <Text style={s.condItem}>• No incluye tributos de importación (DAI, FODINFA, ICE, IVA importación). Los gastos locales con asterisco (*) incluyen IVA 15%.</Text>
          <Text style={s.condItem}>• Tipo de cambio referencial: USD. Gastos de origen sujetos a liquidación final del agente en origen.</Text>
          <Text style={s.condItem}>• Para confirmar reserva, favor contactar a GTL con al menos 7 días de anticipación al embarque.</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Global Trade Logistics S.A.S. · Ecuador</Text>
          <Text style={s.footerBold}>{props.number}</Text>
          <Text style={s.footerText}>Generado por GTL Rate Manager</Text>
        </View>

      </Page>
    </Document>
  )
}
