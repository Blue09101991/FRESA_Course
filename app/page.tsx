"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import AudioPlayer from "@/components/AudioPlayer";
import RegistrationModal from "@/components/RegistrationModal";
import StarsBackground from "@/components/StarsBackground";

export default function Home() {
  const router = useRouter();
  const [showRegistration, setShowRegistration] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const introText = "Hello future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.";

  const handleContinue = () => {
    if (currentStep === 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(1);
        setIsAnimating(false);
      }, 1000);
    } else {
      router.push("/eligibility");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
      {/* Stars background */}
      <StarsBackground />

      {/* Concentric circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-pulse" />
        <div className="absolute inset-[50px] rounded-full border border-blue-500/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-[100px] rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {currentStep === 0 ? (
          <>
            {/* Mr Listings Character - Center */}
            <div className={`mb-8 transition-all duration-1000 ${isAnimating ? 'scale-75 translate-x-[-200px] translate-y-[-200px]' : 'scale-100'}`}>
              <MrListings size="large" />
            </div>

            {/* Text Box */}
            <div className="w-full max-w-2xl mb-8 animate-slide-up">
              <div className="relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-400 rotate-45" />
                <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
                  <AudioPlayer
                    text={introText}
                    audioUrl="/audio/intro.mp3"
                    autoPlay={true}
                    onComplete={() => {}}
                  />
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-4 px-12 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl animate-pulse-glow"
            >
              Let&apos;s Go!
            </button>
          </>
        ) : (
          <>
            {/* Mr Listings Character - Top Left (Small) */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
              <MrListings size="small" isLecturing={true} />
            </div>

            {/* Main Content */}
            <div className="w-full max-w-4xl mt-20 md:mt-24">
              <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                  Eligibility for Licensure
                </h1>
                <AudioPlayer
                  text="Before pursuing a career in real estate, you must meet the basic eligibility criteria set by Florida law (Chapter 475, F.S.). To qualify for a real estate sales associate license, an applicant must: Be at least 18 years of age. Hold a high school diploma or its equivalent, GED. Possess a United States Social Security Number, mandatory for checking compliance with child support obligations). Prior to sitting for the state exam you must show proof of course completion of Florida approved 63 hour pre-license education for sales associates, which is what this course is. Education Exemptions: If you hold a 4 year degree or higher in real estate, you may be exempt from the pre-license education requirement. In order to determine your exemption, submit an original certified transcript with your application to DBPR for review."
                  audioUrl="/audio/eligibility.mp3"
                  autoPlay={false}
                  onComplete={() => {}}
                />
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                className="mt-8 w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-4 px-12 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Continue to Quiz
              </button>
            </div>
          </>
        )}
      </div>

      {/* Registration prompt - show after intro */}
      {currentStep === 1 && typeof window !== "undefined" && !localStorage.getItem("userEmail") && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 z-30 animate-slide-up">
          <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-xl p-4 shadow-2xl">
            <p className="text-white text-sm mb-3">
              Register to save your progress
            </p>
            <button
              onClick={() => setShowRegistration(true)}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200"
            >
              Register Now
            </button>
          </div>
        </div>
      )}

      {showRegistration && (
        <RegistrationModal
          onClose={() => setShowRegistration(false)}
          onRegister={(email) => {
            // Save email to localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("userEmail", email);
            }
            setShowRegistration(false);
          }}
        />
      )}
    </main>
  );
}

