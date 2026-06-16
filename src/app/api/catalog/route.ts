import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_ENTRIES = [
  // LOCAL_CHARGES
  { key: 'b2_logistics', label: 'Logistics Services', value: 225, category: 'LOCAL_CHARGES', appliesIva: false },
  { key: 'b2_admin', label: 'Admin', value: 170, category: 'LOCAL_CHARGES', appliesIva: false },
  { key: 'b2_trasmision', label: 'Trasmision', value: 127, category: 'LOCAL_CHARGES', appliesIva: false },
  { key: 'b2_isd', label: 'Manejo ISD', value: 0, category: 'LOCAL_CHARGES', appliesIva: false },
  { key: 'b2_iva', label: 'IVA', value: 0, category: 'LOCAL_CHARGES', appliesIva: false },
  // THIRD_PARTY - agente
  { key: 'b3_agente_maritimo', label: 'Agente de Aduana Marítimo', value: 332.58, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_agente_aereo', label: 'Agente de Aduana Aéreo', value: 277.15, category: 'THIRD_PARTY', appliesIva: false },
  // THIRD_PARTY - bodegaje
  { key: 'b3_bodegaje_fcl20', label: 'Bodegaje FCL 20GP', value: 450, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_fcl40', label: 'Bodegaje FCL 40GP / 40HQ', value: 550, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_0_2cbm', label: 'Bodegaje hasta 2 CBM', value: 100, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_0_3cbm', label: 'Bodegaje hasta 3 CBM', value: 120, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_0_4cbm', label: 'Bodegaje hasta 4 CBM', value: 180, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_0_5cbm', label: 'Bodegaje hasta 5 CBM', value: 290, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_0_10cbm', label: 'Bodegaje hasta 10 CBM', value: 350, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_bodegaje_10pcbm', label: 'Bodegaje más de 10 CBM', value: 450, category: 'THIRD_PARTY', appliesIva: false },
  // THIRD_PARTY - permisos
  { key: 'b3_permiso_licencias', label: 'Licencias de Importación', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_inen', label: 'INEN', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_mipro', label: 'MIPRO', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_arcsa', label: 'ARCSA', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_no_registro', label: 'No Requiere Registro Sanitario', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_agrocalidad', label: 'Agrocalidad', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_fitosanitario', label: 'Fitosanitario', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  { key: 'b3_permiso_zoosanitario', label: 'Zoosanitario', value: 0, category: 'THIRD_PARTY', appliesIva: false },
  // INLAND_TRANSPORT
  { key: 'b3_trans_gye_lcl', label: 'Transporte GYE — LCL / AIR', value: 100, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_gye_fcl20', label: 'Transporte GYE — FCL 20GP', value: 250, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_gye_fcl40', label: 'Transporte GYE — FCL 40GP/HQ', value: 300, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_uio_lcl', label: 'Transporte UIO — LCL / AIR', value: 350, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_uio_fcl20', label: 'Transporte UIO — FCL 20GP', value: 600, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_uio_fcl40', label: 'Transporte UIO — FCL 40GP/HQ', value: 700, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_otra_fcl20', label: 'Transporte Otra Ciudad — FCL 20GP', value: 750, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_otra_fcl40', label: 'Transporte Otra Ciudad — FCL 40GP/HQ', value: 800, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_otra_1cbm', label: 'Transporte Otra Ciudad — 1 CBM', value: 140, category: 'INLAND_TRANSPORT', appliesIva: false },
  { key: 'b3_trans_otra_cbm_extra', label: 'Transporte Otra Ciudad — por CBM adicional', value: 50, category: 'INLAND_TRANSPORT', appliesIva: false },
] as const

export async function GET() {
  try {
    // Upsert any missing entries
    await Promise.all(
      DEFAULT_ENTRIES.map(entry =>
        prisma.gtlCostConfig.upsert({
          where: { key: entry.key },
          update: {},
          create: {
            key: entry.key,
            label: entry.label,
            value: entry.value,
            appliesIva: entry.appliesIva,
            category: entry.category as any,
          },
        })
      )
    )

    const all = await prisma.gtlCostConfig.findMany({ orderBy: { key: 'asc' } })

    return NextResponse.json({
      localCharges: all.filter(e => e.category === 'LOCAL_CHARGES'),
      agente: all.filter(e => e.key.startsWith('b3_agente_')),
      bodegaje: all.filter(e => e.key.startsWith('b3_bodegaje_')),
      permisos: all.filter(e => e.key.startsWith('b3_permiso_')),
      transport: all.filter(e => e.category === 'INLAND_TRANSPORT'),
    })
  } catch (error) {
    console.error('Catalog GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { key, value } = await request.json()
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    }
    await prisma.gtlCostConfig.update({
      where: { key },
      data: { value },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Catalog PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
