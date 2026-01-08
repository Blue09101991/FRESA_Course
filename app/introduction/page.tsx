"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import AudioPlayer from "@/components/AudioPlayer";
import StarsBackground from "@/components/StarsBackground";
import TableOfContents from "@/components/TableOfContents";
import Header from "@/components/Header";
import { highlightText } from "@/lib/highlightText";

export default function IntroductionPage() {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [introText, setIntroText] = useState("Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.");
  const [audioUrl, setAudioUrl] = useState("/audio/intro.mp3");
  const [timestampsUrl, setTimestampsUrl] = useState("/timestamps/intro.timestamps.json");
  const [loading, setLoading] = useState(true);
  const [searchHighlight, setSearchHighlight] = useState<string>("");

  useEffect(() => {
    fetchIntroduction();
    
    // Check for search highlight query
    const searchQuery = sessionStorage.getItem('searchHighlight');
    if (searchQuery) {
      setSearchHighlight(searchQuery);
      // Clear after a delay to allow highlighting to be applied
      setTimeout(() => {
        sessionStorage.removeItem('searchHighlight');
      }, 5000); // Clear after 5 seconds
    }
  }, []);

  const fetchIntroduction = async () => {
    try {
      // Use public API route that doesn't require authentication
      const response = await fetch("/api/introduction");
      if (response.ok) {
        const data = await response.json();
        if (data.introduction) {
          setIntroText(data.introduction.text || introText);
          setAudioUrl(data.introduction.audioUrl || "/audio/intro.mp3");
          setTimestampsUrl(data.introduction.timestampsUrl || "/timestamps/intro.timestamps.json");
        }
      }
    } catch (err) {
      console.error("Error fetching introduction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Navigate immediately without delay for better performance
    router.push("/chapter-1");
  };

  const menuItems = [
    { id: "intro", title: "Introduction", path: "/introduction" },
    { id: "chapter1", title: "Chapter 1. The Real Estate Business", path: "/chapter-1" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />

      {/* Table of Contents */}
      <TableOfContents items={menuItems} currentPath="/introduction" />

      {/* Concentric circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-pulse" />
        <div className="absolute inset-[50px] rounded-full border border-blue-500/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-[100px] rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
        {/* Mr Listings Character - Center */}
        <div className={`mb-8 transition-all duration-1000 ${isAnimating ? 'scale-75 translate-x-[-200px] translate-y-[-200px] opacity-0' : 'scale-100 opacity-100'}`}>
          <MrListings size="large" />
        </div>

        {/* Text Box */}
        <div className="w-full max-w-2xl mb-8 animate-slide-up">
          <div className="relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-400 rotate-45" />
            <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
              {!loading && (
                <AudioPlayer
                  text={introText}
                  audioUrl={audioUrl}
                  timestampsUrl={timestampsUrl}
                  autoPlay={true}
                  onComplete={() => {
                    // Audio completed, automatically navigate to Chapter 1
                    setTimeout(() => {
                      router.push("/chapter-1");
                    }, 500);
                  }}
                  highlightQuery={searchHighlight}
                />
              )}
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
      </div>
    </main>
  );
}

