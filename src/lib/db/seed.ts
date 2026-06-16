import { PrismaClient, CarrierType, ShipMode, CostCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('GTL2026admin!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gtllogistics.com' },
    update: {},
    create: {
      email: 'admin@gtllogistics.com',
      name: 'Cristhian Talavera',
      passwordHash,
      role: 'ADMIN',
    },
  })

  // Demo carrier
  const carrier = await prisma.carrier.create({
    data: {
      name: 'Agente Demo — China Origin',
      type: CarrierType.CONSOLIDADOR,
      contactEmail: 'rates@agentedemo.com',
      notes: 'Proveedor de demostración para rutas desde China',
    },
  })

  // Demo rate sheet
  const rateSheet = await prisma.rateSheet.create({
    data: {
      carrierId: carrier.id,
      reference: 'Rate Sheet Junio 2026 — China/Ecuador LCL',
      sourceFile: 'demo_rates_jun2026.pdf',
      receivedAt: new Date('2026-06-01'),
      createdById: admin.id,
    },
  })

  // Demo rate: NINGBO → GYE LCL
  await prisma.rate.create({
    data: {
      rateSheetId: rateSheet.id,
      originCountry: 'China',
      originPort: 'NINGBO',
      destinationPort: 'GYE',
      mode: ShipMode.LCL,
      currency: 'USD',
      validFrom: new Date('2026-06-01'),
      validUntil: new Date('2026-06-30'),
      freightRate: 95.00,
      freightUnit: 'CBM',
      thcDestination: 10.00,
      docFee: 64.00,
      vgm: 20.00,
      customsOrigin: 50.00,
      transitDaysMin: 35,
      transitDaysMax: 40,
      frequency: 'Cada 7 días',
      notes: 'Tarifa de demostración. Reemplazar con tarifa real vigente.',
    },
  })

  // GTL cost config
  const costs = [
    { key: 'logistics_service', label: 'Logistics Service', value: 225.00, appliesIva: true, category: CostCategory.LOCAL_CHARGES },
    { key: 'admin', label: 'Admin', value: 170.00, appliesIva: true, category: CostCategory.LOCAL_CHARGES },
    { key: 'transmision', label: 'Transmisión SENAE', value: 115.00, appliesIva: true, category: CostCategory.LOCAL_CHARGES },
    { key: 'loc_isd', label: 'LOC / ISD', value: 67.00, appliesIva: true, category: CostCategory.LOCAL_CHARGES },
    { key: 'customs_agent', label: 'Agente de Aduana', value: 332.58, appliesIva: false, category: CostCategory.THIRD_PARTY },
    { key: 'storage', label: 'Bodegaje Aprox. Patio', value: 150.00, appliesIva: false, category: CostCategory.THIRD_PARTY },
  ]

  for (const cost of costs) {
    await prisma.gtlCostConfig.upsert({
      where: { key: cost.key },
      update: { value: cost.value },
      create: cost,
    })
  }

  // Inland routes
  const routes = [
    { origin: 'GYE', destination: 'UIO', costUsd: 190.00, notes: 'Guayaquil → Quito' },
    { origin: 'GYE', destination: 'CUE', costUsd: 220.00, notes: 'Guayaquil → Cuenca' },
    { origin: 'GYE', destination: 'GYE', costUsd: 80.00, notes: 'Entrega local Guayaquil' },
  ]

  for (const route of routes) {
    await prisma.inlandRoute.create({ data: route })
  }

  console.log('✓ Seed completado — admin@gtllogistics.com / GTL2026admin!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
