import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer'
import path from 'path'

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.jpg')

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const NAVY = '#0d2d6b'
const BLUE = '#1a56db'
const LIGHT_GRAY = '#f0f4ff'
const BORDER = '#c7d7f5'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: '30 40 40 40', backgroundColor: '#ffffff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: NAVY },
  logoBlock: { flexDirection: 'column' },
  logoName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.5 },
  logoSub: { fontSize: 7.5, color: '#64748b', marginTop: 2 },
  quoteInfo: { alignItems: 'flex-end' },
  quoteNumber: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLUE },
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
  totalValue: { fontSize: 14, color: '#ffffff', fontFamily: 'Helvetica-Bold' },

  // Conditions + footer
  conditions: { backgroundColor: LIGHT_GRAY, borderRadius: 4, borderWidth: 1, borderLeftWidth: 3, borderColor: BORDER, borderLeftColor: NAVY, padding: '8 12', marginBottom: 14 },
  condTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', marginBottom: 5 },
  condItem: { fontSize: 7.5, color: '#334155', marginBottom: 2.5 },
  footer: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7, color: '#94a3b8' },
  footerBold: { fontSize: 7, color: NAVY, fontFamily: 'Helvetica-Bold' },

  // Page 2
  p2header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: NAVY },
  p2section: { marginBottom: 14 },
  p2title: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  p2subtitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', marginTop: 6, marginBottom: 3 },
  p2text: { fontSize: 7.5, color: '#475569', marginBottom: 2.5, lineHeight: 1.4 },
  p2highlight: { fontSize: 7.5, color: '#334155', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  p2box: { backgroundColor: LIGHT_GRAY, borderRadius: 4, borderWidth: 1, borderColor: BORDER, padding: '8 12', marginBottom: 10 },
  p2row: { flexDirection: 'row', gap: 12 },
  p2col: { flex: 1 },
  p2bankBox: { backgroundColor: '#eff6ff', borderRadius: 4, borderWidth: 1, borderColor: '#bfdbfe', padding: '8 12', marginTop: 8 },
  p2bankTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  p2bankText: { fontSize: 7.5, color: '#1e40af', marginBottom: 1.5 },
  p2warning: { backgroundColor: '#fff7ed', borderRadius: 4, borderWidth: 1, borderColor: '#fed7aa', padding: '7 10', marginBottom: 6 },
  p2warningText: { fontSize: 7.5, color: '#92400e', lineHeight: 1.4 },
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
  deliveryCity?: string | null
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
  const destFinal = props.deliveryCity === 'UIO' ? 'Quito' : props.deliveryCity === 'OTRA' ? 'destino final' : 'Guayaquil'

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <Image src={LOGO_PATH} style={{ width: 90, height: 90, objectFit: 'contain' }} />
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
          dot={BLUE}
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
          <Text style={s.footerText}>Página 1 de 2</Text>
        </View>

      </Page>

      {/* ── PÁGINA 2: Condiciones ── */}
      <Page size="A4" style={s.page}>

        {/* Header p2 */}
        <View style={s.p2header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src={LOGO_PATH} style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <View>
              <Text style={[s.logoName, { fontSize: 11 }]}>GLOBAL TRADE LOGISTICS</Text>
              <Text style={s.logoSub}>Agente de Carga Internacional · Ecuador</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.quoteNumber, { fontSize: 11 }]}>{props.number}</Text>
            <Text style={s.logoSub}>Condiciones Comerciales</Text>
          </View>
        </View>

        {/* 1. Alcance del servicio */}
        <View style={s.p2section}>
          <Text style={s.p2title}>1. Alcance del Servicio</Text>
          <View style={s.p2row}>
            {/* GTL hace */}
            <View style={[s.p2col, { backgroundColor: '#f0f7ff', borderRadius: 4, borderWidth: 1, borderColor: '#bfdbfe', padding: '8 10', marginRight: 6 }]}>
              <Text style={[s.p2subtitle, { color: NAVY, marginTop: 0, marginBottom: 5 }]}>GTL GESTIONA POR USTED:</Text>
              <Text style={s.p2text}>• Coordinación del transporte internacional</Text>
              <Text style={s.p2text}>• Agenciamiento aduanero en Ecuador (SENAE)</Text>
              <Text style={s.p2text}>• Cálculo de aranceles e impuestos de importación con base en la proforma de la naviera</Text>
              <Text style={s.p2text}>• Transmisión y seguimiento de la declaración aduanera</Text>
              <Text style={s.p2text}>• Transporte nacional hasta {destFinal}</Text>
              <Text style={s.p2text}>• Asesoría y seguimiento en cada etapa del proceso</Text>
            </View>
            {/* Cliente paga directo */}
            <View style={[s.p2col, { backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderLeftWidth: 3, borderColor: '#cbd5e1', borderLeftColor: '#475569', padding: '8 10' }]}>
              <Text style={[s.p2subtitle, { color: '#1e293b', marginTop: 0, marginBottom: 5 }]}>EL CLIENTE PAGA DIRECTAMENTE A:</Text>
              <Text style={[s.p2text, { color: '#1e293b', fontFamily: 'Helvetica-Bold', marginBottom: 3 }]}>SENAE — Aduana Ecuador:</Text>
              <Text style={[s.p2text, { color: '#334155' }]}>• DAI · FODINFA · ICE · IVA importación</Text>
              <Text style={[s.p2text, { color: '#1e293b', marginTop: 4, marginBottom: 3, fontFamily: 'Helvetica-Bold' }]}>Terminal / Puerto marítimo:</Text>
              <Text style={[s.p2text, { color: '#334155' }]}>• Bodegajes y servicios portuarios</Text>
              <Text style={[s.p2text, { color: '#334155' }]}>• Scanners y aforos físicos</Text>
              <Text style={[s.p2text, { color: '#475569', marginTop: 5, lineHeight: 1.5, fontFamily: 'Helvetica-Oblique' }]}>Nota: GTL calcula estos valores con anticipación e informa al cliente. El pago siempre es directo a la entidad correspondiente, nunca a GTL.</Text>
            </View>
          </View>
        </View>

        {/* 2. Aranceles */}
        <View style={s.p2section}>
          <Text style={s.p2title}>2. Aranceles e Impuestos de Importación</Text>
          <View style={{ backgroundColor: '#f0f4ff', borderRadius: 4, borderWidth: 1, borderLeftWidth: 3, borderColor: BORDER, borderLeftColor: NAVY, padding: '8 12', marginBottom: 8 }}>
            <Text style={[s.p2highlight, { color: NAVY, marginBottom: 4 }]}>¿Cómo funcionan los aranceles?</Text>
            <Text style={s.p2text}>GTL calcula los aranceles e impuestos de importación con base en los valores de la proforma comercial y la proforma de la naviera. Estos cálculos se entregan al cliente antes del despacho aduanero para su revisión y aprobación.</Text>
            <Text style={[s.p2text, { marginTop: 4 }]}>El pago se realiza <Text style={{ fontFamily: 'Helvetica-Bold' }}>directamente al SENAE</Text> a través de los canales oficiales — nunca a través de GTL. La liquidación final depende de la verificación documental y el canal de aforo asignado.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['DAI', 'Arancel sobre el valor CIF de la mercadería'],
              ['FODINFA', '0.5% sobre el valor CIF'],
              ['ICE', 'Aplica según el tipo de producto'],
              ['IVA', '15% sobre base imponible total'],
            ].map(([label, desc], i) => (
              <View key={i} style={{ flex: 1, backgroundColor: LIGHT_GRAY, borderRadius: 4, borderWidth: 1, borderColor: BORDER, padding: '5 8' }}>
                <Text style={[s.p2highlight, { color: NAVY, marginBottom: 2, fontSize: 8 }]}>{label}</Text>
                <Text style={[s.p2text, { marginBottom: 0, fontSize: 7 }]}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Condiciones de pago */}
        <View style={s.p2section}>
          <Text style={s.p2title}>3. Proceso y Condiciones de Pago</Text>
          <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', backgroundColor: NAVY, padding: '4 10' }}>
              <Text style={[s.p2highlight, { flex: 1, color: '#ffffff', marginBottom: 0 }]}>Concepto</Text>
              <Text style={[s.p2highlight, { width: 80, color: '#ffffff', marginBottom: 0 }]}>A quién</Text>
              <Text style={[s.p2highlight, { width: 130, color: '#ffffff', marginBottom: 0 }]}>Cuándo</Text>
            </View>
            {[
              ['Flete internacional', 'GTL', 'Al arribo de la carga a Ecuador'],
              ['Agente de aduana', 'GTL', 'Al obtener la salida autorizada (DAE)'],
              ['Transporte nacional', 'GTL', 'Al despachar hacia el destino final'],
              ['Póliza de seguro (si aplica)', 'GTL', 'Al coordinarse el embarque'],
              ['Aranceles e impuestos', 'SENAE', 'Antes del desaduanamiento'],
              ['Servicios portuarios', 'Terminal', 'Según facturación del terminal'],
            ].map(([svc, who, when], i) => (
              <View key={i} style={{ flexDirection: 'row', padding: '4 10', backgroundColor: i % 2 === 1 ? LIGHT_GRAY : '#ffffff', borderTopWidth: 1, borderTopColor: BORDER }}>
                <Text style={[s.p2text, { flex: 1, marginBottom: 0 }]}>{svc}</Text>
                <Text style={[s.p2text, { width: 80, marginBottom: 0, fontFamily: 'Helvetica-Bold', color: who === 'GTL' ? NAVY : '#b91c1c' }]}>{who}</Text>
                <Text style={[s.p2text, { width: 130, marginBottom: 0 }]}>{when}</Text>
              </View>
            ))}
          </View>

          {/* Datos bancarios */}
          <View style={s.p2bankBox}>
            <Text style={s.p2bankTitle}>Datos bancarios para pagos a GTL</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={s.p2bankText}>Banco: Produbanco</Text>
              <Text style={s.p2bankText}>Tipo: Cta. Corriente</Text>
              <Text style={s.p2bankText}>N°: 27059115225</Text>
            </View>
            <Text style={[s.p2bankText, { marginTop: 2 }]}>Beneficiario: Global Trade Logistics S.A.S. · RUC: 1793228976001</Text>
          </View>
        </View>

        {/* 4. Condiciones Generales */}
        <View style={s.p2section}>
          <Text style={s.p2title}>4. Condiciones Generales</Text>
          <View style={s.p2box}>
            <Text style={s.p2text}>• Esta cotización aplica para <Text style={{ fontFamily: 'Helvetica-Bold' }}>carga general</Text>. Cargas peligrosas, sobredimensionadas o especiales requieren cotización aparte.</Text>
            <Text style={s.p2text}>• Los valores de flete están sujetos a disponibilidad de espacio y confirmación de la naviera a la fecha de reserva.</Text>
            <Text style={s.p2text}>• Los tiempos de tránsito son referenciales y pueden variar por congestión portuaria o demoras en origen sin previo aviso.</Text>
            <Text style={s.p2text}>• GTL no se hace responsable por multas, almacenajes extendidos ni demoras causadas por documentación incompleta del cliente o restricciones SENAE.</Text>
            <Text style={s.p2text}>• Para confirmar la reserva, contactar a GTL con mínimo <Text style={{ fontFamily: 'Helvetica-Bold' }}>7 días de anticipación</Text> al embarque. La reserva se confirma con el anticipo acordado.</Text>
            <Text style={[s.p2text, { marginBottom: 0 }]}>• El seguro de carga <Text style={{ fontFamily: 'Helvetica-Bold' }}>no está incluido</Text> salvo solicitud expresa por escrito. GTL recomienda asegurar la mercadería por el valor CIF + 10%.</Text>
          </View>
        </View>

        {/* Footer p2 */}
        <View style={[s.footer, { position: 'absolute', bottom: 30, left: 40, right: 40 }]}>
          <Text style={s.footerText}>Global Trade Logistics S.A.S. · Ecuador</Text>
          <Text style={s.footerBold}>{props.number}</Text>
          <Text style={s.footerText}>Página 2 de 2</Text>
        </View>

      </Page>
    </Document>
  )
}
