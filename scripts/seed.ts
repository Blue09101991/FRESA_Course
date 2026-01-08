import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminEmail = 'admin@example.com'
  const adminUsername = 'admin'
  const adminPassword = await hashPassword('admin123')

  // Check if admin exists by email or username
  let admin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { username: adminUsername },
      ],
    },
  })

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        name: 'Admin User',
        phone: null,
        role: UserRole.Admin,
      },
    })
    console.log('✅ Created admin user:', admin.email)
  } else {
    console.log('✅ Admin user already exists:', admin.email)
  }

  console.log('✅ Created admin user:', admin.email)

  // Create Introduction (Chapter 0)
  const introChapter = await prisma.chapter.upsert({
    where: { number: 0 },
    update: {},
    create: {
      number: 0,
      title: 'Introduction',
      description: 'Course Introduction Page',
    },
  })

  console.log('✅ Created Introduction Chapter (Chapter 0)')

  // Create or update Introduction Section
  const introText = "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission."
  
  let introSection = await prisma.section.findFirst({
    where: {
      chapterId: introChapter.id,
      type: 'introduction',
    },
  })

  if (!introSection) {
    introSection = await prisma.section.create({
      data: {
        chapterId: introChapter.id,
        sectionNumber: 0,
        title: 'Introduction',
        text: introText,
        type: 'introduction',
        audioUrl: '/audio/intro.mp3',
        timestampsUrl: '/timestamps/intro.timestamps.json',
        order: 0,
      },
    })
    console.log('✅ Created Introduction section')
  } else {
    // Update if exists but missing text/audio/timestamps (initialize with defaults)
    const needsUpdate = !introSection.text || !introSection.text.trim() || 
                        !introSection.audioUrl || !introSection.timestampsUrl
    if (needsUpdate) {
      await prisma.section.update({
        where: { id: introSection.id },
        data: {
          text: introSection.text && introSection.text.trim() ? introSection.text : introText,
          audioUrl: introSection.audioUrl || '/audio/intro.mp3',
          timestampsUrl: introSection.timestampsUrl || '/timestamps/intro.timestamps.json',
        },
      })
      console.log('✅ Updated Introduction section with original data')
    } else {
      console.log('✅ Introduction section already exists with data')
    }
  }

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

  // Create Sections - ALL 11 original sections
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
    {
      sectionNumber: 3,
      title: 'Real Estate Professionals',
      text: "Real estate professionals provide expert knowledge in three key areas: Property Transfer: Conveying or transferring legal ownership of real estate properties through documents like deeds, titles, and contracts. As a real estate agent you will work with Title companies who will take care of transferring documents. Your job will be to find buyers, sellers, tenants, and landlords who will want to hire you to represent them.",
      type: 'content',
      audioUrl: '/audio/chapter1-section3.mp3',
      timestampsUrl: '/timestamps/chapter1-section3.timestamps.json',
      order: 2,
    },
    {
      sectionNumber: 4,
      title: 'Market Conditions',
      text: "Market Conditions: Understanding supply, demand, interest rates, and price movements is very important. For example, if interest rates for mortgages are low, many buyers will be buying homes, supply of available homes for sale will decrease, and prices of remaining homes will go up. On the other hand, when interest rates for mortgages are high, many buyers will not be able to afford to buy homes. This will result in low demand and high supply of homes for sale sitting on the market. Prices of homes will drop in this case.",
      type: 'content',
      audioUrl: '/audio/chapter1-section4.mp3',
      timestampsUrl: '/timestamps/chapter1-section4.timestamps.json',
      order: 3,
    },
    {
      sectionNumber: 5,
      title: 'Real Estate Brokerage',
      text: "Real Estate Brokerage, for example ABC Realty, is a firm (a business) in which all real estate activities are performed under the authority of a real estate broker. They provide expert information that the average person does not possess. As a Sales Associate you will be working under the direction and control of a Broker. Sales Associates can't be paid by a client directly. The commission has to be paid to the broker, and the broker pays the associate.",
      type: 'content',
      audioUrl: '/audio/chapter1-section5.mp3',
      timestampsUrl: '/timestamps/chapter1-section5.timestamps.json',
      order: 4,
    },
    {
      sectionNumber: 6,
      title: 'Target Marketing and Farming',
      text: "Target Marketing and Farming are strategies for finding new clients. Farming is a more narrow form of Targeting. You may decided to specialize in a specific neighborhood or type of property to become experts in that niche. For example, you may want to specialize in waterfront luxury condos, 55+ communities or commercial properties in a specific part of town. You then start targeting clients specifically in that area. This method of target marketing is called Farming.",
      type: 'content',
      audioUrl: '/audio/chapter1-section6.mp3',
      timestampsUrl: '/timestamps/chapter1-section6.timestamps.json',
      order: 5,
    },
    {
      sectionNumber: 7,
      title: 'Five Major Sales Specialties',
      text: "There are 5 Major Sales Specialties: 1. Residential properties - Housing with 4 units or fewer, or vacant land zoned for 4 units or less. This includes Single Family homes, townhouses, condos, or multifamily units with 4 units or fewer. 2. Commercial Properties are Income-producing properties, for example offices, retail centers, etc. 3. Industrial Properties are buildings where Manufacturing of products takes place, warehouses for storing products, and distribution facilities. 4. Agricultural Properties are Farms and land of more than 10 acres. 5. Businesses: The sale of business opportunities. This often includes the sale of stock or assets (personal property) rather than just land.",
      type: 'content',
      audioUrl: '/audio/chapter1-section7.mp3',
      timestampsUrl: '/timestamps/chapter1-section7.timestamps.json',
      order: 6,
    },
    {
      sectionNumber: 8,
      title: 'Property Management',
      text: "Property Management is the professional service of leasing, managing, marketing, and maintaining property for others. The primary goal is to protect the owner's investment and maximize return. Absentee Owner: Property owners who do not reside on the property and often rely on professional property managers. For example, the owner lives in New York, but owns a property in Florida, which he rents out for profit. This owner can hire you to manage his absentee property, deal with tenants, collect rent, hire handyman or a professional company when repairs are needed.",
      type: 'content',
      audioUrl: '/audio/chapter1-section8.mp3',
      timestampsUrl: '/timestamps/chapter1-section8.timestamps.json',
      order: 7,
    },
    {
      sectionNumber: 9,
      title: 'Community Association Manager',
      text: "Community Association Manager (CAM): A separate license required for managers of associations with more than 10 units or an annual budget over $100,000. Real estate licensees are not automatically qualified as CAMs.",
      type: 'content',
      audioUrl: '/audio/chapter1-section9.mp3',
      timestampsUrl: '/timestamps/chapter1-section9.timestamps.json',
      order: 8,
    },
    {
      sectionNumber: 10,
      title: 'Appraising, Valuation, and USPAP',
      text: "Appraisal: The process of developing an opinion of value. It is a regulated activity. When you become a sales associate, you may appraise properties for compensation, as long as you don't represent yourself as state-certified or licensed appraiser (unless you also have an appraisal license). The Florida Real Estate Appraisal Board (FREAB) regulates state-certified and licensed appraisers. Only a state-certified or licensed appraiser can prepare an appraisal that involves a federally related transaction.",
      type: 'content',
      audioUrl: '/audio/chapter1-section10.mp3',
      timestampsUrl: '/timestamps/chapter1-section10.timestamps.json',
      order: 9,
    },
    {
      sectionNumber: 11,
      title: 'Comparative Market Analysis',
      text: "Comparative Market Analysis (CMA). After you get your real estate license, and if you find a client who is looking to sell their property, they may ask you to analyze the market, and let them know how much they can sell their property for. It will be your job to analyze recent sales of similar properties, to determine a reasonable price for your clients property. This process is called Comparative Market Analysis.",
      type: 'content',
      audioUrl: '/audio/chapter1-section11.mp3',
      timestampsUrl: '/timestamps/chapter1-section11.timestamps.json',
      order: 10,
    },
  ]

  // Upsert sections (update if exists, create if not)
  for (const section of sections) {
    const existing = await prisma.section.findFirst({
      where: {
        chapterId: chapter1.id,
        sectionNumber: section.sectionNumber,
      },
    })

    if (existing) {
      // Update existing section, but preserve admin modifications if text exists
      await prisma.section.update({
        where: { id: existing.id },
        data: {
          title: section.title,
          // Only update text if it's empty or matches default (preserve admin edits)
          text: existing.text && existing.text.trim().length > 0 ? existing.text : section.text,
          type: section.type,
          // Only update audio/timestamps if they're not set
          audioUrl: existing.audioUrl || section.audioUrl,
          timestampsUrl: existing.timestampsUrl || section.timestampsUrl,
          order: section.order,
        },
      })
    } else {
      // Create new section
      await prisma.section.create({
        data: {
          chapterId: chapter1.id,
          ...section,
        },
      })
    }
  }

  console.log('✅ Created/Updated all 11 sections')

  // Create Quiz Questions - ALL 6 original questions
  const quizQuestions = [
    {
      question: "The field of property management has experienced growth and specialization primarily because of",
      options: [
        "The deregulation of the real estate industry.",
        "The increase in the number of licensees specializing in property management.",
        "The increase in the number of absentee owners.",
        "Higher construction costs that have caused an increase in the number of renters."
      ],
      correctAnswer: 2,
      explanation: {
        correct: "The increase in the number of absentee owners. This has created a demand for professional property management services.",
        incorrect: [
          "The deregulation of the real estate industry. The real estate industry has not been deregulated; it remains heavily regulated by state laws (like Chapter 475 F.S.) and federal laws to protect the public.",
          "The increase in the number of licensees specializing in property management. This increase is a result of the growing demand for property management, not the cause of it. The demand (from owners) must exist before licensees choose to specialize in it.",
          "The increase in the number of absentee owners. This has created a demand for professional property management services.",
          "Higher construction costs that have caused an increase in the number of renters. While an increase in renters creates a market for rental properties, the specific need for professional management arises from the owner's inability or unwillingness to manage the property themselves (often due to being absentee), rather than just the cost of construction."
        ]
      },
      quizType: 'chapter',
      order: 0,
    },
    {
      question: "The five major sales specialties do NOT include",
      options: [
        "agricultural.",
        "special use.",
        "commercial.",
        "businesses."
      ],
      correctAnswer: 1,
      explanation: {
        correct: "Special use. The five major sales specialties defined in the real estate industry and Florida course curriculum are Residential, Commercial, Industrial, Agricultural, and Businesses. 'Special use' is typically a category used in appraisal or zoning (referring to properties like schools, churches, or cemeteries) rather than a primary sales specialty for licensees.",
        incorrect: [
          "agricultural. Agricultural property (farms and land over 10 acres) is one of the five recognized sales specialties.",
          "Special use. The five major sales specialties defined in the real estate industry and Florida course curriculum are Residential, Commercial, Industrial, Agricultural, and Businesses. 'Special use' is typically a category used in appraisal or zoning (referring to properties like schools, churches, or cemeteries) rather than a primary sales specialty for licensees.",
          "commercial. Commercial property (income-producing property like retail centers and offices) is one of the five recognized sales specialties.",
          "businesses. Business brokerage (selling business opportunities, often including assets and goodwill) is one of the five recognized sales specialties."
        ]
      },
      quizType: 'chapter',
      order: 1,
    },
    {
      question: "Which type of construction involves building to a buyer's specifications?",
      options: [
        "Tract homes",
        "Spec homes",
        "Custom homes",
        "Model homes"
      ],
      correctAnswer: 2,
      explanation: {
        correct: "Custom homes. Custom homes are built specifically to a buyer's unique specifications and designs. The buyer usually owns the lot and hires a builder to construct a home that meets their specific needs and desires, rather than choosing from a pre-set list of options.",
        incorrect: [
          "Tract homes. Tract homes are mass-produced in a subdivision where the developer offers a limited selection of floor plans. Buyers may get to choose a model and some finishes, but they cannot redesign the structure.",
          "Spec homes. 'Spec' stands for speculation. These homes are built by a developer without a specific buyer in mind, in the hope (speculation) that someone will buy the home once it is completed.",
          "Custom homes. Custom homes are built specifically to a buyer's unique specifications and designs. The buyer usually owns the lot and hires a builder to construct a home that meets their specific needs and desires, rather than choosing from a pre-set list of options.",
          "Model homes. Model homes are display properties used by developers to showcase the various floor plans and features available in a subdivision. They are marketing tools rather than a specific construction category for a buyer."
        ]
      },
      quizType: 'chapter',
      order: 2,
    },
    {
      question: "Managing which type of property of more than 10 units requires a CAM license?",
      options: [
        "Apartment building",
        "Commercial property",
        "Business complex",
        "Condominium complex"
      ],
      correctAnswer: 3,
      explanation: {
        correct: "Condominium complex. A Community Association Manager (CAM) license is required in Florida for individuals who manage a community association (such as a condominium association, homeowner association, or cooperative) that contains more than 10 units or has an annual budget in excess of $100,000. Since a condominium complex consists of individually owned units governed by an association, it falls under this requirement.",
        incorrect: [
          "Apartment building. Apartment buildings are typically owned by a single entity (like a corporation or investor) and the units are rented out, rather than individually owned. Therefore, they do not have a 'community association' of owners. Managers of apartment buildings generally perform property management duties (which may require a Real Estate Broker's license or fall under the salaried employee exemption) but do not need a CAM license.",
          "Commercial property. Commercial properties (like office buildings or retail centers) generally do not fall under the statutory definition of a 'community association' (which is primarily defined in FL statutes as residential HOAs, condos, and co-ops). Managing them requires a real estate license if paid by commission, but not a CAM license.",
          "Business complex. Similar to commercial property, a business complex is typically an income-producing commercial investment and does not function as a residential community association involving homeowners. Thus, a CAM license is not required.",
          "Condominium complex. A Community Association Manager (CAM) license is required in Florida for individuals who manage a community association (such as a condominium association, homeowner association, or cooperative) that contains more than 10 units or has an annual budget in excess of $100,000. Since a condominium complex consists of individually owned units governed by an association, it falls under this requirement."
        ]
      },
      quizType: 'chapter',
      order: 3,
    },
    {
      question: "Effective advertising involving developing a database of prospects to direct a specific message is called",
      options: [
        "institutional advertising.",
        "computer efficiency.",
        "target marketing.",
        "merchandizing."
      ],
      correctAnswer: 2,
      explanation: {
        correct: "Target marketing. Target marketing involves defining a specific group of potential customers (prospects) and directing marketing efforts specifically toward them. Developing a database of prospects to send a tailored, specific message is a key component of this strategy. In real estate, 'farming' is a common form of target marketing where a licensee focuses on a specific demographic or geographic area.",
        incorrect: [
          "institutional advertising. Institutional advertising is designed to build the reputation and brand awareness of the brokerage or company as a whole, rather than selling a specific property or targeting a specific list of prospects with a direct message.",
          "computer efficiency. This is a general term referring to how well a computer system performs tasks. While computers are used to maintain databases, 'computer efficiency' is not the marketing strategy itself.",
          "Target marketing. Target marketing involves defining a specific group of potential customers (prospects) and directing marketing efforts specifically toward them. Developing a database of prospects to send a tailored, specific message is a key component of this strategy. In real estate, 'farming' is a common form of target marketing where a licensee focuses on a specific demographic or geographic area.",
          "merchandizing. Merchandising typically refers to the presentation and display of products in a retail environment to stimulate interest and sales. It is not the term used for database-driven prospect marketing in real estate."
        ]
      },
      quizType: 'chapter',
      order: 4,
    },
    {
      question: "A broker charges a prospective seller $50 for a comparative market analysis (CMA). Which statement applies?",
      options: [
        "Brokers are not permitted to charge for CMAs.",
        "This is permissible, provided the broker does not represent the CMA as an appraisal.",
        "The broker must be a state-certified or licensed appraiser to do this.",
        "The CMA must be signed by a state-certified or licensed appraiser."
      ],
      correctAnswer: 1,
      explanation: {
        correct: "This is permissible, provided the broker does not represent the CMA as an appraisal. Real estate licensees are allowed to perform valuation services, such as a Comparative Market Analysis (CMA), for a fee. However, Florida law strictly prohibits referring to this report as an 'appraisal.' A CMA is an estimate of value used primarily for marketing purposes (listing or selling), whereas an appraisal must strictly comply with USPAP (Uniform Standards of Professional Appraisal Practice) and is usually required for financing purposes.",
        incorrect: [
          "Brokers are not permitted to charge for CMAs. Licensees are permitted to charge a fee for preparing a CMA, though many provide it as a complimentary service to secure a listing.",
          "This is permissible, provided the broker does not represent the CMA as an appraisal. Real estate licensees are allowed to perform valuation services, such as a Comparative Market Analysis (CMA), for a fee. However, Florida law strictly prohibits referring to this report as an 'appraisal.' A CMA is an estimate of value used primarily for marketing purposes (listing or selling), whereas an appraisal must strictly comply with USPAP (Uniform Standards of Professional Appraisal Practice) and is usually required for financing purposes.",
          "The broker must be a state-certified or licensed appraiser to do this. A real estate license grants the authority to provide valuation services like CMAs and Broker Price Opinions (BPOs) for compensation, as long as they are not for federally related transactions (like most mortgages) which require a certified appraiser.",
          "The CMA must be signed by a state-certified or licensed appraiser. A CMA is prepared and signed by the real estate licensee (sales associate or broker), not an appraiser."
        ]
      },
      quizType: 'chapter',
      order: 5,
    },
  ]

  // Upsert quiz questions (update if exists, create if not)
  for (let i = 0; i < quizQuestions.length; i++) {
    const question = quizQuestions[i]
    const existing = await prisma.quizQuestion.findFirst({
      where: {
        chapterId: chapter1.id,
        order: i,
        quizType: 'chapter',
      },
    })

    if (existing) {
      // Update existing question, but preserve admin modifications
      await prisma.quizQuestion.update({
        where: { id: existing.id },
        data: {
          question: existing.question && existing.question.trim().length > 0 ? existing.question : question.question,
          options: existing.options && existing.options.length > 0 ? existing.options : question.options,
          correctAnswer: question.correctAnswer,
          explanation: existing.explanation && typeof existing.explanation === 'object' ? existing.explanation : question.explanation,
          // Preserve audio URLs if they exist
          audioUrl: existing.audioUrl || undefined,
          timestampsUrl: existing.timestampsUrl || undefined,
          correctExplanationAudioUrl: existing.correctExplanationAudioUrl || undefined,
          correctExplanationTimestampsUrl: existing.correctExplanationTimestampsUrl || undefined,
          incorrectExplanationAudioUrls: existing.incorrectExplanationAudioUrls ? existing.incorrectExplanationAudioUrls as any : undefined,
          incorrectExplanationTimestampsUrls: existing.incorrectExplanationTimestampsUrls ? existing.incorrectExplanationTimestampsUrls as any : undefined,
          order: i,
        },
      })
    } else {
      // Create new question
      await prisma.quizQuestion.create({
        data: {
          chapterId: chapter1.id,
          ...question,
          order: i,
        },
      })
    }
  }

  console.log('✅ Created/Updated all 6 quiz questions')

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

