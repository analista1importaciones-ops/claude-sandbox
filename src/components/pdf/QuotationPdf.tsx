import {
  Document, Image, Page, StyleSheet, Text, View,
} from '@react-pdf/renderer'

const LOGO_PATH = `${process.cwd()}/public/logo.jpg`

const NAVY = '#0d2d6b'
const ORANGE = '#e36b0c'
const LIGHT = '#f0f4ff'
const BORDER = '#c7d7f5'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: 34, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: NAVY },
  logo: { width: 90, height: 58, objectFit: 'contain' },
  label: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: NAVY },
  number: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: ORANGE, marginTop: 3 },
  text: { fontSize: 8.5, color: '#475569', lineHeight: 1.35 },
  strong: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  metaRow: { flexDirection: 'row', marginBottom: 12 },
  box: { flex: 1, backgroundColor: LIGHT, borderColor: BORDER, borderWidth: 1, borderRadius: 4, padding: 8 },
  boxMiddle: { marginLeft: 8, marginRight: 8 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', marginBottom: 5 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  head: { flexDirection: 'row', backgroundColor: NAVY, padding: 6 },
  headText: { color: '#ffffff', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', padding: 6, borderTopWidth: 1, borderTopColor: BORDER },
  rowAlt: { backgroundColor: '#f8fafc' },
  cell: { flex: 1, fontSize: 8.3, color: '#334155' },
  amount: { width: 86, fontSize: 8.3, color: '#0f172a', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  subtotal: { flexDirection: 'row', padding: 6, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: LIGHT },
  subtotalLabel: { flex: 1, fontSize: 8.3, color: NAVY, fontFamily: 'Helvetica-Bold' },
  subtotalAmount: { width: 86, fontSize: 8.3, color: NAVY, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  totalBox: { marginTop: 8, marginBottom: 12, alignItems: 'flex-end' },
  totalInner: { width: 250, backgroundColor: NAVY, borderRadius: 6, padding: 10, flexDirection: 'row' },
  totalLabel: { flex: 1, color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  totalValue: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  notes: { backgroundColor: LIGHT, borderLeftWidth: 3, borderLeftColor: NAVY, padding: 8, marginBottom: 10 },
  conditions: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, marginTop: 4 },
  condText: { fontSize: 7.5, color: '#475569', lineHeight: 1.35, marginBottom: 2 },
  infoSection: { marginBottom: 11 },
  infoTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', marginBottom: 5, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, marginBottom: 7 },
  infoBoxBlue: { backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, marginBottom: 7 },
  infoBoxWarn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 4, padding: 8, marginBottom: 7 },
  infoText: { fontSize: 8, color: '#475569', lineHeight: 1.4, marginBottom: 3 },
  infoStrong: { fontSize: 8, color: '#1e293b', fontFamily: 'Helvetica-Bold', lineHeight: 1.4, marginBottom: 3 },
  twoCol: { flexDirection: 'row', marginBottom: 8 },
  colLeft: { flex: 1, marginRight: 8 },
  colRight: { flex: 1 },
  miniTable: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 8 },
  miniHead: { flexDirection: 'row', backgroundColor: NAVY, padding: 5 },
  miniHeadText: { color: '#ffffff', fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  miniRow: { flexDirection: 'row', padding: 5, borderTopWidth: 1, borderTopColor: BORDER },
  miniCell: { flex: 1, fontSize: 7.5, color: '#475569', lineHeight: 1.3 },
  miniCellBold: { flex: 1, fontSize: 7.5, color: '#1e293b', fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
  footer: { position: 'absolute', bottom: 22, left: 34, right: 34, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
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
  LCL: 'LCL',
  FCL20: 'FCL 20GP',
  FCL40: 'FCL 40GP',
  FCL40HC: 'FCL 40HQ',
  AIR: 'Aereo',
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}

function LineTable({ title, items, subtotal, currency }: {
  title: string
  items: LineItem[]
  subtotal: number
  currency: string
}) {
  if (!items.length) return null
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.table}>
        <View style={s.head}>
          <Text style={[s.headText, { flex: 1 }]}>Concepto</Text>
          <Text style={[s.headText, { width: 86, textAlign: 'right' }]}>{currency}</Text>
        </View>
        {items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={[s.row, index % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cell}>{item.label}</Text>
            <Text style={s.amount}>{money(item.amount)}</Text>
          </View>
        ))}
        <View style={s.subtotal}>
          <Text style={s.subtotalLabel}>Subtotal</Text>
          <Text style={s.subtotalAmount}>{money(subtotal)}</Text>
        </View>
      </View>
    </View>
  )
}

function Footer({ number, page }: { number: string; page: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>Global Trade Logistics S.A.S. - Ecuador</Text>
      <Text style={s.footerText}>{number}</Text>
      <Text style={s.footerText}>{page}</Text>
    </View>
  )
}

function Bullet({ children }: { children: string }) {
  return <Text style={s.infoText}>- {children}</Text>
}

export default function QuotationPdf(props: QuotationPdfProps) {
  const quantity = props.cbm
    ? `${props.cbm} CBM`
    : props.containers
      ? `${props.containers} contenedor${props.containers === 1 ? '' : 'es'}`
      : 'A confirmar'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={LOGO_PATH} style={s.logo} />
            <Text style={s.text}>Global Trade Logistics S.A.S.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Cotizacion de flete</Text>
            <Text style={s.title}>COTIZACION</Text>
            <Text style={s.number}>{props.number}</Text>
            <Text style={s.text}>Emision: {dateLabel(props.issueDate)}</Text>
            <Text style={s.text}>Valida hasta: {dateLabel(props.validUntil)}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.box}>
            <Text style={s.label}>Cliente</Text>
            <Text style={s.strong}>{props.customerName}</Text>
            {props.customerEmail && <Text style={s.text}>{props.customerEmail}</Text>}
            {props.customerPhone && <Text style={s.text}>{props.customerPhone}</Text>}
          </View>
          <View style={[s.box, s.boxMiddle]}>
            <Text style={s.label}>Ruta</Text>
            <Text style={s.strong}>{props.originPort} - {props.destinationPort}</Text>
            <Text style={s.text}>{props.originCountry}</Text>
            <Text style={s.text}>{modeLabel[props.mode] ?? props.mode} · {props.incoterm}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Carga</Text>
            <Text style={s.strong}>{quantity}</Text>
            {props.productDesc && <Text style={s.text}>{props.productDesc}</Text>}
            {props.transitDaysMin && props.transitDaysMax && (
              <Text style={s.text}>Transito: {props.transitDaysMin}-{props.transitDaysMax} dias</Text>
            )}
            {props.frequency && <Text style={s.text}>{props.frequency}</Text>}
          </View>
        </View>

        <LineTable title="Bloque 1 - Transporte internacional" items={props.intlCharges} subtotal={props.intlTotal} currency={props.currency} />
        <LineTable title="Bloque 2 - Gastos locales GTL" items={props.localCharges} subtotal={props.localTotal} currency={props.currency} />
        <LineTable title="Bloque 3 - Otros costos" items={props.otherCharges} subtotal={props.otherTotal} currency={props.currency} />

        <View style={s.totalBox}>
          <View style={s.totalInner}>
            <Text style={s.totalLabel}>Total general</Text>
            <Text style={s.totalValue}>{money(props.grandTotal)}</Text>
          </View>
        </View>

        {props.notes && (
          <View style={s.notes}>
            <Text style={s.label}>Observaciones</Text>
            <Text style={s.text}>{props.notes}</Text>
          </View>
        )}

        <View style={s.conditions}>
          <Text style={s.label}>Condiciones comerciales</Text>
          <Text style={s.condText}>- Cotizacion sujeta a disponibilidad de espacio y confirmacion de la naviera.</Text>
          <Text style={s.condText}>- Valores referenciales; pueden variar por volumen, peso, tipo de carga o cambios del proveedor.</Text>
          <Text style={s.condText}>- Aranceles, impuestos SENAE, bodegajes y gastos portuarios se calculan segun documentos finales.</Text>
          <Text style={s.condText}>- Para confirmar reserva, contactar a GTL con al menos 7 dias de anticipacion al embarque.</Text>
        </View>

        <Footer number={props.number} page="Pagina 1 de 3" />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={LOGO_PATH} style={s.logo} />
            <Text style={s.text}>Global Trade Logistics S.A.S.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Condiciones del servicio</Text>
            <Text style={s.title}>ALCANCE Y PAGOS</Text>
            <Text style={s.number}>{props.number}</Text>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>1. Alcance del servicio</Text>
          <View style={s.twoCol}>
            <View style={[s.infoBoxBlue, s.colLeft]}>
              <Text style={s.infoStrong}>GTL gestiona por usted:</Text>
              <Bullet>Coordinacion del transporte internacional.</Bullet>
              <Bullet>Agenciamiento aduanero en Ecuador ante SENAE.</Bullet>
              <Bullet>Calculo estimado de aranceles e impuestos de importacion.</Bullet>
              <Bullet>Transmision y seguimiento de la declaracion aduanera.</Bullet>
              <Bullet>Coordinacion de transporte nacional cuando aplique.</Bullet>
              <Bullet>Asesoria y seguimiento operativo durante el proceso.</Bullet>
            </View>
            <View style={[s.infoBox, s.colRight]}>
              <Text style={s.infoStrong}>El cliente paga directamente a:</Text>
              <Bullet>SENAE: DAI, FODINFA, ICE e IVA de importacion.</Bullet>
              <Bullet>Terminal o puerto: bodegajes, servicios portuarios, scanners y aforos fisicos.</Bullet>
              <Bullet>Entidades regulatorias cuando existan permisos, certificados o inspecciones especiales.</Bullet>
              <Text style={s.infoText}>GTL calcula y comunica estos valores, pero el pago se realiza a la entidad correspondiente.</Text>
            </View>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>2. Aranceles e impuestos de importacion</Text>
          <View style={s.infoBoxBlue}>
            <Text style={s.infoText}>Los aranceles e impuestos se calculan con base en los documentos finales de la carga, la partida arancelaria, el valor CIF y la normativa vigente de SENAE. Los valores estimados pueden variar luego de la revision documental o del canal de aforo asignado.</Text>
          </View>
          <View style={s.miniTable}>
            <View style={s.miniHead}>
              <Text style={[s.miniHeadText, { flex: 1 }]}>Concepto</Text>
              <Text style={[s.miniHeadText, { flex: 2 }]}>Descripcion</Text>
            </View>
            {[
              ['DAI', 'Arancel sobre el valor CIF segun partida arancelaria.'],
              ['FODINFA', 'Contribucion calculada sobre el valor CIF.'],
              ['ICE', 'Aplica solo para productos gravados por normativa.'],
              ['IVA importacion', 'Se calcula sobre la base imponible de importacion.'],
            ].map(([label, description], index) => (
              <View key={label} style={[s.miniRow, index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
                <Text style={s.miniCellBold}>{label}</Text>
                <Text style={[s.miniCell, { flex: 2 }]}>{description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>3. Proceso y condiciones de pago</Text>
          <View style={s.miniTable}>
            <View style={s.miniHead}>
              <Text style={s.miniHeadText}>Concepto</Text>
              <Text style={s.miniHeadText}>A quien se paga</Text>
              <Text style={s.miniHeadText}>Momento de pago</Text>
            </View>
            {[
              ['Flete internacional', 'GTL', 'Al arribo o segun reserva confirmada.'],
              ['Agente de aduana', 'GTL', 'Durante el proceso de nacionalizacion.'],
              ['Transporte nacional', 'GTL', 'Al coordinar despacho al destino final.'],
              ['Poliza de seguro', 'GTL', 'Al coordinar el embarque si fue solicitada.'],
              ['Aranceles e impuestos', 'SENAE', 'Antes del desaduanamiento.'],
              ['Servicios portuarios', 'Terminal', 'Segun facturacion del terminal.'],
            ].map(([concept, who, when], index) => (
              <View key={concept} style={[s.miniRow, index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
                <Text style={s.miniCell}>{concept}</Text>
                <Text style={s.miniCellBold}>{who}</Text>
                <Text style={s.miniCell}>{when}</Text>
              </View>
            ))}
          </View>
          <View style={s.infoBoxBlue}>
            <Text style={s.infoStrong}>Datos bancarios para pagos a GTL</Text>
            <Text style={s.infoText}>Produbanco - Cuenta corriente 27059115225</Text>
            <Text style={s.infoText}>Beneficiario: Globaltradelogistics S.A.S. - RUC: 1793228976001</Text>
            <Text style={s.infoText}>Enviar comprobante a: aduanas@globaltradelogisticsec.com</Text>
          </View>
        </View>

        <Footer number={props.number} page="Pagina 2 de 3" />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={LOGO_PATH} style={s.logo} />
            <Text style={s.text}>Global Trade Logistics S.A.S.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Condiciones del servicio</Text>
            <Text style={s.title}>CONDICIONES GENERALES</Text>
            <Text style={s.number}>{props.number}</Text>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>4. Condiciones generales</Text>
          <View style={s.infoBox}>
            <Bullet>Esta cotizacion aplica para carga general. Cargas peligrosas, sobredimensionadas, refrigeradas o especiales requieren revision y cotizacion independiente.</Bullet>
            <Bullet>Los valores de flete estan sujetos a disponibilidad de espacio, confirmacion de naviera, aerolinea o proveedor logistico.</Bullet>
            <Bullet>Los tiempos de transito son referenciales y pueden variar por congestion portuaria, inspecciones, clima, cambios operativos o demoras en origen/destino.</Bullet>
            <Bullet>La cotizacion puede variar si cambia el volumen, peso, cantidad de bultos, descripcion de mercaderia, incoterm o destino final.</Bullet>
            <Bullet>Documentos incompletos, inconsistentes o entregados fuera de tiempo pueden generar demoras, multas, almacenajes o costos adicionales a cargo del cliente.</Bullet>
            <Bullet>El seguro de carga no esta incluido salvo solicitud expresa por escrito. GTL recomienda asegurar la mercaderia por el valor CIF mas un margen de cobertura.</Bullet>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>5. Responsabilidades del cliente</Text>
          <View style={s.infoBoxBlue}>
            <Bullet>Entregar factura comercial, packing list, documentos de transporte y permisos requeridos de forma completa y oportuna.</Bullet>
            <Bullet>Confirmar descripcion real de la mercaderia, valores, cantidades, peso, volumen y partida arancelaria cuando aplique.</Bullet>
            <Bullet>Realizar pagos a SENAE, terminales, proveedores o entidades regulatorias dentro de los plazos indicados.</Bullet>
            <Bullet>Informar si la carga requiere permiso, inspeccion, registro sanitario, certificacion tecnica, control previo o manejo especial.</Bullet>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>6. Exclusiones y costos adicionales</Text>
          <View style={s.infoBoxWarn}>
            <Bullet>No incluye multas, almacenajes extendidos, demoras, sobreestadias, inspecciones no previstas, aforos fisicos, gastos por rectificaciones o documentos incompletos.</Bullet>
            <Bullet>No incluye costos derivados de cambios normativos, restricciones de importacion, abandono de carga, reembarques, destruccion o retenciones por autoridad competente.</Bullet>
            <Bullet>Todo costo adicional sera informado al cliente tan pronto sea notificado por la naviera, terminal, SENAE, proveedor logistico o autoridad correspondiente.</Bullet>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoTitle}>7. Aceptacion de la cotizacion</Text>
          <View style={s.infoBox}>
            <Text style={s.infoText}>La aprobacion escrita por WhatsApp, correo electronico o cualquier medio verificable confirma que el cliente acepta los valores, alcance y condiciones descritas en esta cotizacion. Para reservar espacio o iniciar gestion documental, GTL podra solicitar anticipo o confirmacion formal del servicio.</Text>
          </View>
        </View>

        <Footer number={props.number} page="Pagina 3 de 3" />
      </Page>
    </Document>
  )
}
