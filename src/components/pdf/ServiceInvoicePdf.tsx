import {
  Document, Image, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import { PAYMENT_ACCOUNTS, PAYMENT_RECEIPT_EMAIL } from '@/lib/paymentAccounts'

const NAVY = '#0d2d6b'
const ORANGE = '#e36b0c'
const LIGHT = '#f0f4ff'
const BORDER = '#c7d7f5'
const GTL_LOGO = `${process.cwd()}/public/logo.jpg`
const AURIGA_LOGO = `${process.cwd()}/public/auriga-logo.jpeg`

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: '24 38 28 38', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: NAVY },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: { width: 86, height: 48, objectFit: 'contain' },
  aurigaImage: { width: 70, height: 48, objectFit: 'contain' },
  logoSub: { fontSize: 7.5, color: '#64748b', marginTop: 4 },
  label: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },
  number: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: ORANGE, marginTop: 3 },
  date: { fontSize: 8, color: '#475569', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  box: { flex: 1, backgroundColor: LIGHT, borderColor: BORDER, borderWidth: 1, borderRadius: 4, padding: '8 10' },
  boxValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 3 },
  boxText: { fontSize: 8, color: '#475569', lineHeight: 1.35 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: NAVY, padding: '5 8' },
  headText: { color: '#ffffff', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: BORDER },
  rowAlt: { backgroundColor: '#f8fafc' },
  cell: { fontSize: 8.5, color: '#334155' },
  totalWrap: { marginTop: 10, alignItems: 'flex-end' },
  totalLine: { flexDirection: 'row', width: 220, padding: '4 8', borderBottomWidth: 1, borderBottomColor: BORDER },
  totalLabel: { flex: 1, fontSize: 8.5, color: '#475569' },
  totalValue: { width: 80, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  grand: { backgroundColor: NAVY, borderBottomWidth: 0, padding: '7 8' },
  grandText: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 12, backgroundColor: LIGHT, borderLeftWidth: 3, borderLeftColor: NAVY, padding: '8 10', fontSize: 8, color: '#334155' },
  paymentBox: { marginTop: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  paymentHeader: { backgroundColor: NAVY, padding: '5 9' },
  paymentHeaderText: { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  paymentRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  paymentAccount: { flex: 1, padding: '7 9' },
  paymentTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  paymentText: { fontSize: 7.8, color: '#334155', lineHeight: 1.35 },
  receiptText: { fontSize: 8, color: ORANGE, fontFamily: 'Helvetica-Bold', padding: '6 9', backgroundColor: '#fff7ed' },
  footer: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6, marginTop: 16, alignItems: 'center' },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

type ServiceInvoiceItem = {
  description: string
  quantity: number
  unitPrice: number
  appliesIva: boolean
}

interface ServiceInvoicePdfProps {
  number: string
  issueDate: string
  dueDate?: string | null
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  customerTaxId?: string | null
  customerAddress?: string | null
  serviceTag?: string | null
  currency: string
  items: ServiceInvoiceItem[]
  subtotal: number
  ivaTotal: number
  total: number
  notes?: string | null
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function ServiceInvoicePdf(props: ServiceInvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <View style={s.brandBlock}>
              <Image src={GTL_LOGO} style={s.logoImage} />
              <Image src={AURIGA_LOGO} style={s.aurigaImage} />
            </View>
            <Text style={s.logoSub}>Global Trade Logistics S.A.S.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Documento de cobro</Text>
            <Text style={s.title}>FACTURA DE SERVICIOS</Text>
            <Text style={s.number}>{props.number}</Text>
            <Text style={s.date}>
              Emisión: {new Date(props.issueDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.box}>
            <Text style={s.label}>Cliente</Text>
            <Text style={s.boxValue}>{props.customerName}</Text>
            {props.customerTaxId && <Text style={s.boxText}>RUC/Cédula: {props.customerTaxId}</Text>}
            {props.customerEmail && <Text style={s.boxText}>Email: {props.customerEmail}</Text>}
            {props.customerPhone && <Text style={s.boxText}>Teléfono: {props.customerPhone}</Text>}
            {props.customerAddress && <Text style={s.boxText}>Dirección: {props.customerAddress}</Text>}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Servicio</Text>
            <Text style={s.boxValue}>{props.serviceTag ?? 'Servicios GTL'}</Text>
            <Text style={s.boxText}>Moneda: {props.currency}</Text>
            {props.dueDate && (
              <Text style={s.boxText}>Vencimiento: {new Date(props.dueDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.headText, { flex: 1 }]}>Descripción</Text>
            <Text style={[s.headText, { width: 50, textAlign: 'right' }]}>Cant.</Text>
            <Text style={[s.headText, { width: 80, textAlign: 'right' }]}>Unitario</Text>
            <Text style={[s.headText, { width: 80, textAlign: 'right' }]}>Total</Text>
          </View>
          {props.items.map((item, index) => (
            <View key={index} style={[s.row, index % 2 === 1 ? s.rowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{item.description}{item.appliesIva ? ' · IVA' : ''}</Text>
              <Text style={[s.cell, { width: 50, textAlign: 'right' }]}>{item.quantity}</Text>
              <Text style={[s.cell, { width: 80, textAlign: 'right' }]}>{money(item.unitPrice)}</Text>
              <Text style={[s.cell, { width: 80, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{money(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalWrap}>
          <View style={s.totalLine}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{money(props.subtotal)}</Text>
          </View>
          <View style={s.totalLine}>
            <Text style={s.totalLabel}>IVA</Text>
            <Text style={s.totalValue}>{money(props.ivaTotal)}</Text>
          </View>
          <View style={[s.totalLine, s.grand]}>
            <Text style={[s.totalLabel, s.grandText]}>Total</Text>
            <Text style={[s.totalValue, s.grandText]}>{money(props.total)}</Text>
          </View>
        </View>

        {props.notes && <Text style={s.notes}>{props.notes}</Text>}

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

        <View style={s.footer}>
          <Text style={s.footerText}>GTL Global Trade Logistics S.A.S. · Ecuador · Documento de cobro generado desde GTL CRM</Text>
        </View>
      </Page>
    </Document>
  )
}
