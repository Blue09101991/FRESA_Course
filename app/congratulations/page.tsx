"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import StarsBackground from "@/components/StarsBackground";
import Header from "@/components/Header";

export default function CongratulationsPage() {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);
  const [confetti, setConfetti] = useState<Array<{ left: number; top: number; delay: number; size: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only generate confetti on client side to avoid hydration mismatch
    setMounted(true);
    const generatedConfetti = Array.from({ length: 30 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      size: Math.random() * 20 + 20,
    }));
    setConfetti(generatedConfetti);

    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center p-4">
        <Header />
        {/* Stars background */}
        <StarsBackground />

      {/* Confetti effect */}
      {mounted && showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {confetti.map((item, i) => (
            <div
              key={i}
              className="absolute animate-bounce-gentle"
              style={{
                left: `${item.left}%`,
                top: `${item.top}%`,
                animationDelay: `${item.delay}s`,
                fontSize: `${item.size}px`,
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center max-w-2xl">
        {/* Mr Listings with congratulations animation */}
        <div className="mb-8 flex justify-center">
          <MrListings size="large" animation="congratulations" />
        </div>

        {/* Congratulations Message */}
        <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-8 md:p-12 shadow-2xl animate-scale-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-blue-300">
            Congratulations! 🎉
          </h1>
          <p className="text-xl md:text-2xl text-white mb-6">
            You&apos;ve completed Chapter 1!
          </p>
          <p className="text-gray-300 mb-8">
            Great job! You&apos;ve successfully completed the first chapter of your
            Florida Real Estate Sales Associate pre-license education course.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/chapter-1")}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
            >
              Review Chapter
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-all duration-200 font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

