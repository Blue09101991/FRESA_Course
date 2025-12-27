import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminEmail = 'admin@example.com'
  const adminPassword = await hashPassword('admin123')

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      phone: null,
      role: UserRole.Admin,
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create Chapter 1
  const chapter1 = await prisma.chapter.upsert({
    where: { number: 1 },
    update: {},
    create: {
      number: 1,
      title: 'The Real Estate Business',
      description: 'Introduction to real estate industry and business practices',
    },
  })

  console.log('✅ Created Chapter 1')

  // Create Learning Objectives
  const objectives = [
    'Describe the various activities of real estate brokerage',
    'Distinguish among the five major sales specialties',
    'Identify the role of property managers',
    'Describe activities that require appraiser services and distinguish among CMA, BPO, and appraisal',
    'Understand the mortgage process and the role of mortgage loan originator',
    'Explain the three phases of development and construction',
    'Distinguish among the three categories of residential construction',
  ]

  // Delete existing objectives for this chapter
  await prisma.learningObjective.deleteMany({
    where: { chapterId: chapter1.id },
  })

  for (let i = 0; i < objectives.length; i++) {
    await prisma.learningObjective.create({
      data: {
        chapterId: chapter1.id,
        text: objectives[i],
        order: i,
      },
    })
  }

  console.log('✅ Created learning objectives')

  // Create Key Terms
  const keyTerms = [
    'absentee owner',
    'appraisal',
    'appraiser',
    'broker price opinion (BPO)',
    'business broker',
    'business opportunity',
    'community association manager (CAM)',
    'comparative market analysis (CMA)',
    'dedication',
    'farm area (target market)',
  ]

  // Delete existing key terms for this chapter
  await prisma.keyTerm.deleteMany({
    where: { chapterId: chapter1.id },
  })

  for (let i = 0; i < keyTerms.length; i++) {
    await prisma.keyTerm.create({
      data: {
        chapterId: chapter1.id,
        term: keyTerms[i],
        order: i,
      },
    })
  }

  console.log('✅ Created key terms')

  // Create Sections
  const sections = [
    {
      sectionNumber: 1,
      title: 'The Real Estate Industry',
      text: "The Real Estate Industry plays a key role in the nation's economy by driving construction, creating jobs, enabling homeownership and investment, generating tax revenue, and supporting related industries like banking, insurance, and retail, which together stimulate overall economic growth.",
      type: 'content',
      audioUrl: '/audio/chapter1-section1.mp3',
      timestampsUrl: '/timestamps/chapter1-section1.timestamps.json',
      order: 0,
    },
    {
      sectionNumber: 2,
      title: 'Economic Impact',
      text: 'Many industries rely on real estate activity because buying, selling, and building properties create demand for services like construction, architecture, banking, insurance, home improvement, and property management, making real estate a central driver of economic activity.',
      type: 'content',
      audioUrl: '/audio/chapter1-section2.mp3',
      timestampsUrl: '/timestamps/chapter1-section2.timestamps.json',
      order: 1,
    },
  ]

  for (const section of sections) {
    await prisma.section.upsert({
      where: {
        chapterId_sectionNumber: {
          chapterId: chapter1.id,
          sectionNumber: section.sectionNumber,
        },
      },
      update: {},
      create: {
        chapterId: chapter1.id,
        ...section,
      },
    })
  }

  console.log('✅ Created sections')

  console.log('🎉 Database seed completed!')
  console.log('\n📝 Default Admin Credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')
  console.log('\n⚠️  Please change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

