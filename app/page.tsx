"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import StarsBackground from "@/components/StarsBackground";
import FloatingParticles from "@/components/FloatingParticles";
import UserMenu from "@/components/UserMenu";

export default function Home() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Show character after a brief delay
    setTimeout(() => setIsReady(true), 300);
    // Show button after character appears
    setTimeout(() => setShowButton(true), 1500);
  }, []);

  const handleGetStarted = async () => {
    // Check if user is authenticated
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];

    if (!token) {
      // Store intended destination and redirect to login
      sessionStorage.setItem("redirectAfterLogin", "/introduction");
      router.push("/login");
      return;
    }

    // Verify token is valid
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push("/introduction");
      } else {
        sessionStorage.setItem("redirectAfterLogin", "/introduction");
        router.push("/login");
      }
    } catch (err) {
      sessionStorage.setItem("redirectAfterLogin", "/introduction");
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center">
      {/* Stars background */}
      <StarsBackground />

      {/* User Menu - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <UserMenu />
      </div>

      {/* Concentric circles - animated */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-pulse" />
        <div className="absolute inset-[80px] rounded-full border border-blue-500/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-[160px] rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-[240px] rounded-full border border-blue-400/20 animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        {/* App Name */}
        <div className={`mb-12 transition-all duration-1000 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in">
            Florida Real Estate
          </h1>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-blue-300 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            Sales Associate Course
          </h2>
          <div className="mt-6 text-lg md:text-xl text-gray-300 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            63 Hour Pre-License Education
          </div>
        </div>

        {/* Mr Listings Character - Large and Animated */}
        <div className={`mb-12 transition-all duration-1000 ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} style={{ transitionDelay: "0.5s" }}>
          <MrListings size="large" />
        </div>

        {/* WELCOME Button */}
        <div className={`transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white font-bold py-5 px-16 rounded-2xl text-xl md:text-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-2xl hover:shadow-blue-500/50 animate-pulse-glow"
          >
            WELCOME
          </button>
        </div>
      </div>

      {/* Floating particles effect */}
      <FloatingParticles />
    </main>
  );
}
