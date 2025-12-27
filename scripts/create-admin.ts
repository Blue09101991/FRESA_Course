import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Get arguments from command line
  const email = process.argv[2] || 'admin@example.com'
  const username = process.argv[3] || 'admin'
  const password = process.argv[4] || 'admin123'
  const name = process.argv[5] || 'Admin User'
  const phone = process.argv[6] || null

  console.log('🔐 Creating admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Username: ${username}`)
  console.log(`   Name: ${name}`)
  if (phone) console.log(`   Phone: ${phone}`)

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log('⚠️  User with this email already exists. Updating to Admin role...')
  }

  const hashedPassword = await hashPassword(password)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.Admin,
      password: hashedPassword,
      username,
      name,
      phone: phone || null,
    },
    create: {
      email,
      username,
      password: hashedPassword,
      name,
      phone: phone || null,
      role: UserRole.Admin,
    },
  })

  console.log('\n✅ Admin user created/updated successfully!')
  console.log(`   ID: ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Username: ${admin.username}`)
  console.log(`   Name: ${admin.name}`)
  console.log(`   Role: ${admin.role}`)
  console.log('\n📝 Login Credentials:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log('\n⚠️  Please change the password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin:', e)
    if (e.code === 'P2002') {
      console.error('   Error: Email or username already exists')
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

