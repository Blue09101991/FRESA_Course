"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import AudioPlayer from "@/components/AudioPlayer";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import { chapter1Questions } from "@/lib/chapter1Data";
import StarsBackground from "@/components/StarsBackground";

export default function Chapter1Page() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  const sections = [
    {
      title: "The Real Estate Industry",
      text: "The Real Estate Industry plays a key role in the nation's economy by driving construction, creating jobs, enabling homeownership and investment, generating tax revenue, and supporting related industries like banking, insurance, and retail, which together stimulate overall economic growth.",
      audioUrl: "/audio/chapter1-section1.mp3"
    },
    {
      title: "Economic Impact",
      text: "Many industries rely on real estate activity because buying, selling, and building properties create demand for services like construction, architecture, banking, insurance, home improvement, and property management, making real estate a central driver of economic activity.",
      audioUrl: "/audio/chapter1-section2.mp3"
    },
    {
      title: "Real Estate Professionals",
      text: "Real estate professionals provide expert knowledge in three key areas: Property Transfer: Conveying or transferring legal ownership of real estate properties through documents like deeds, titles, and contracts. As a real estate agent you will work with Title companies who will take care of transferring documents. Your job will be to find buyers, sellers, tenants, and landlords who will want to hire you to represent them.",
      audioUrl: "/audio/chapter1-section3.mp3"
    },
    {
      title: "Market Conditions",
      text: "Market Conditions: Understanding supply, demand, interest rates, and price movements is very important. For example, if interest rates for mortgages are low, many buyers will be buying homes, supply of available homes for sale will decrease, and prices of remaining homes will go up. On the other hand, when interest rates for mortgages are high, many buyers will not be able to afford to buy homes. This will result in low demand and high supply of homes for sale sitting on the market. Prices of homes will drop in this case.",
      audioUrl: "/audio/chapter1-section4.mp3"
    },
    {
      title: "Real Estate Brokerage",
      text: "Real Estate Brokerage, for example ABC Realty, is a firm (a business) in which all real estate activities are performed under the authority of a real estate broker. They provide expert information that the average person does not possess. As a Sales Associate you will be working under the direction and control of a Broker. Sales Associates can't be paid by a client directly. The commission has to be paid to the broker, and the broker pays the associate.",
      audioUrl: "/audio/chapter1-section5.mp3"
    },
    {
      title: "Target Marketing and Farming",
      text: "Target Marketing and Farming are strategies for finding new clients. Farming is a more narrow form of Targeting. You may decided to specialize in a specific neighborhood or type of property to become experts in that niche. For example, you may want to specialize in waterfront luxury condos, 55+ communities or commercial properties in a specific part of town. You then start targeting clients specifically in that area. This method of target marketing is called Farming.",
      audioUrl: "/audio/chapter1-section6.mp3"
    },
    {
      title: "Five Major Sales Specialties",
      text: "There are 5 Major Sales Specialties: 1. Residential properties - Housing with 4 units or fewer, or vacant land zoned for 4 units or less. This includes Single Family homes, townhouses, condos, or multifamily units with 4 units or fewer. 2. Commercial Properties are Income-producing properties, for example offices, retail centers, etc. 3. Industrial Properties are buildings where Manufacturing of products takes place, warehouses for storing products, and distribution facilities. 4. Agricultural Properties are Farms and land of more than 10 acres. 5. Businesses: The sale of business opportunities. This often includes the sale of stock or assets (personal property) rather than just land.",
      audioUrl: "/audio/chapter1-section7.mp3"
    },
    {
      title: "Property Management",
      text: "Property Management is the professional service of leasing, managing, marketing, and maintaining property for others. The primary goal is to protect the owner's investment and maximize return. Absentee Owner: Property owners who do not reside on the property and often rely on professional property managers. For example, the owner lives in New York, but owns a property in Florida, which he rents out for profit. This owner can hire you to manage his absentee property, deal with tenants, collect rent, hire handyman or a professional company when repairs are needed.",
      audioUrl: "/audio/chapter1-section8.mp3"
    },
    {
      title: "Community Association Manager",
      text: "Community Association Manager (CAM): A separate license required for managers of associations with more than 10 units or an annual budget over $100,000. Real estate licensees are not automatically qualified as CAMs.",
      audioUrl: "/audio/chapter1-section9.mp3"
    },
    {
      title: "Appraising, Valuation, and USPAP",
      text: "Appraisal: The process of developing an opinion of value. It is a regulated activity. When you become a sales associate, you may appraise properties for compensation, as long as you don't represent yourself as state-certified or licensed appraiser (unless you also have an appraisal license). The Florida Real Estate Appraisal Board (FREAB) regulates state-certified and licensed appraisers. Only a state-certified or licensed appraiser can prepare an appraisal that involves a federally related transaction.",
      audioUrl: "/audio/chapter1-section10.mp3"
    },
    {
      title: "Comparative Market Analysis",
      text: "Comparative Market Analysis (CMA). After you get your real estate license, and if you find a client who is looking to sell their property, they may ask you to analyze the market, and let them know how much they can sell their property for. It will be your job to analyze recent sales of similar properties, to determine a reasonable price for your clients property. This process is called Comparative Market Analysis.",
      audioUrl: "/audio/chapter1-section11.mp3"
    }
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    const progress = {
      chapter: 1,
      section: "complete",
      score,
      total,
      completed: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("chapter1Progress", JSON.stringify(progress));
    router.push("/congratulations");
  };

  if (showQuiz) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden p-4 md:p-8">
        <StarsBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            Chapter 1 Quiz
          </h1>
          <Quiz questions={chapter1Questions} onComplete={handleQuizComplete} />
        </div>
      </main>
    );
  }

  const currentSectionData = sections[currentSection];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
      {/* Stars background */}
      <StarsBackground />

      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="absolute top-4 left-4 md:top-8 md:left-8">
            <MrListings size="small" isLecturing={true} />
          </div>
          <div className="text-center mt-20 md:mt-24">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              FLORIDA REAL ESTATE SALES ASSOCIATE COURSE
            </h1>
            <p className="text-blue-300 text-lg md:text-xl">
              Chapter 1 of 19: COURSE OVERVIEW AND THE REAL ESTATE BUSINESS
            </p>
            <div className="mt-4 text-sm text-gray-400">
              Section {currentSection + 1} of {sections.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                {currentSectionData.title}
              </h2>
              <AudioPlayer
                text={currentSectionData.text}
                audioUrl={currentSectionData.audioUrl}
                autoPlay={false}
                onComplete={() => {}}
              />
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {currentSection < sections.length - 1 ? "Next Section" : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

