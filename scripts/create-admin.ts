import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Get arguments from command line
  const email = process.argv[2] || 'admin@example.com'
  const username = process.argv[3] || 'admin'
  const password = process.argv[4] || 'admin123'
  const name = process.argv[5] || 'Super Admin'
  const phone = process.argv[6] || null

  console.log('🔐 Creating Super Admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Username: ${username}`)
  console.log(`   Name: ${name}`)
  if (phone) console.log(`   Phone: ${phone}`)
  console.log('')

  // Check if email already exists
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  })

  // Check if username already exists (and it's not the same user)
  const existingUserByUsername = await prisma.user.findUnique({
    where: { username },
  })

  if (existingUserByEmail && existingUserByUsername && existingUserByEmail.id !== existingUserByUsername.id) {
    console.error('❌ Error: Both email and username are taken by different users!')
    console.error(`   Email is used by: ${existingUserByEmail.email}`)
    console.error(`   Username is used by: ${existingUserByUsername.username}`)
    process.exit(1)
  }

  if (existingUserByEmail) {
    console.log('⚠️  User with this email already exists. Updating to Admin role...')
  } else if (existingUserByUsername) {
    console.log('⚠️  User with this username already exists. Updating to Admin role...')
  }

  const hashedPassword = await hashPassword(password)

  // Use upsert with email as unique identifier, but also check username
  let admin
  if (existingUserByEmail) {
    // Update existing user by email
    admin = await prisma.user.update({
      where: { email },
      data: {
        role: UserRole.Admin,
        password: hashedPassword,
        username,
        name,
        phone: phone || null,
      },
    })
  } else if (existingUserByUsername) {
    // Update existing user by username
    admin = await prisma.user.update({
      where: { username },
      data: {
        role: UserRole.Admin,
        password: hashedPassword,
        email,
        name,
        phone: phone || null,
      },
    })
  } else {
    // Create new user
    admin = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: UserRole.Admin,
      },
    })
  }

  console.log('\n✅ Super Admin user created/updated successfully!')
  console.log(`   ID: ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Username: ${admin.username}`)
  console.log(`   Name: ${admin.name}`)
  console.log(`   Role: ${admin.role}`)
  console.log('\n📝 Login Credentials:')
  console.log(`   Email: ${email}`)
  console.log(`   Username: ${username}`)
  console.log(`   Password: ${password}`)
  console.log('\n⚠️  IMPORTANT: Please change the password after first login!')
  console.log('\n💡 You can now login at: http://localhost:3000/login')
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

