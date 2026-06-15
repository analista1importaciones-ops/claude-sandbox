import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gtllogistics.com' },
    update: {},
    create: {
      email: 'admin@gtllogistics.com',
      name: 'Administrador GTL',
      passwordHash,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Demo carrier
  const carrier = await prisma.carrier.upsert({
    where: { id: 'demo-carrier-001' },
    update: {},
    create: {
      id: 'demo-carrier-001',
      name: 'COSCO Shipping Lines',
      type: 'NAVIERA',
      contactEmail: 'rates@cosco.com',
      notes: 'Demo carrier for testing',
    },
  })
  console.log('Created carrier:', carrier.name)

  // Demo rate sheet
  const rateSheet = await prisma.rateSheet.upsert({
    where: { id: 'demo-ratesheet-001' },
    update: {},
    create: {
      id: 'demo-ratesheet-001',
      carrierId: carrier.id,
      reference: 'COSCO-2024-Q1',
      receivedAt: new Date('2024-01-01'),
      createdById: admin.id,
      rates: {
        create: [
          {
            originCountry: 'China',
            originPort: 'Shanghai',
            destinationPort: 'Guayaquil',
            mode: 'LCL',
            currency: 'USD',
            validFrom: new Date('2024-01-01'),
            validUntil: new Date('2024-12-31'),
            freightRate: 45.00,
            thcCfs: 12.00,
            docFee: 50.00,
            transitDaysMin: 28,
            transitDaysMax: 35,
            frequency: 'Weekly',
          },
        ],
      },
    },
  })
  console.log('Created rate sheet:', rateSheet.reference)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
