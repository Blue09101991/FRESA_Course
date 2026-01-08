// Default/Original Chapter Data
// This file contains the original course content that will be used as fallback
// when admin hasn't modified the data in the database

export interface DefaultSection {
  sectionNumber: number;
  title: string;
  text: string;
  type: string;
  audioUrl: string;
  timestampsUrl: string;
  order: number;
}

export interface DefaultChapterData {
  number: number;
  title: string;
  description: string | null;
  sections: DefaultSection[];
}

// Default Chapter 1 Data
export const defaultChapter1Data: DefaultChapterData = {
  number: 1,
  title: 'The Real Estate Business',
  description: 'Introduction to real estate industry and business practices',
  sections: [
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
  ],
};

// Helper function to get default chapter data
export function getDefaultChapterData(chapterNumber: number): DefaultChapterData | null {
  switch (chapterNumber) {
    case 1:
      return defaultChapter1Data;
    // Add more chapters here as needed
    default:
      return null;
  }
}

// Helper function to merge database data with defaults
export function mergeWithDefaults(
  dbData: any,
  defaultData: DefaultChapterData
): any {
  // Merge chapter info
  const mergedChapter = {
    ...defaultData,
    ...dbData,
    title: dbData.title || defaultData.title,
    description: dbData.description || defaultData.description,
  };

  // Merge sections
  const dbSections = dbData.sections || [];
  const defaultSections = defaultData.sections || [];
  
  // Create a map of database sections by sectionNumber
  const dbSectionsMap = new Map(
    dbSections.map((s: any) => [s.sectionNumber, s])
  );

  // Merge sections: use DB section if it exists and has content, otherwise use default
  const mergedSections = defaultSections.map((defaultSection) => {
    const dbSection: any = dbSectionsMap.get(defaultSection.sectionNumber);
    
    if (dbSection && dbSection.text && typeof dbSection.text === 'string' && dbSection.text.trim().length > 0) {
      // Use DB section, but fallback to default audio/timestamps if not set
      return {
        ...defaultSection,
        ...dbSection,
        audioUrl: dbSection.audioUrl || defaultSection.audioUrl,
        timestampsUrl: dbSection.timestampsUrl || defaultSection.timestampsUrl,
      };
    } else {
      // Use default section
      return {
        ...defaultSection,
        id: dbSection?.id || `default-section-${defaultSection.sectionNumber}`,
        chapterId: dbData.id,
      };
    }
  });

  // Add any additional DB sections that don't have defaults
  const defaultSectionNumbers = new Set(defaultSections.map(s => s.sectionNumber));
  dbSections.forEach((dbSection: any) => {
    if (!defaultSectionNumbers.has(dbSection.sectionNumber)) {
      mergedSections.push(dbSection);
    }
  });

  // Sort by order
  mergedSections.sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    ...mergedChapter,
    sections: mergedSections,
  };
}

