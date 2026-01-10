"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MrListings from "@/components/MrListings";
import StarsBackground from "@/components/StarsBackground";
import Header from "@/components/Header";

function CongratulationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(true);
  const [confetti, setConfetti] = useState<Array<{ left: number; top: number; delay: number; size: number }>>([]);
  const [mounted, setMounted] = useState(false);
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get chapter number from URL params or sessionStorage
    const chapterParam = searchParams.get('chapter');
    const chapterFromStorage = sessionStorage.getItem('completedChapter');
    const chapterNum = chapterParam ? parseInt(chapterParam) : (chapterFromStorage ? parseInt(chapterFromStorage) : 1);
    
    setChapterNumber(chapterNum);
    
    // Fetch chapter data to get the title
    if (chapterNum) {
      fetchChapterData(chapterNum);
    } else {
      setLoading(false);
    }

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
  }, [searchParams]);

  const fetchChapterData = async (chapterNum: number) => {
    try {
      const response = await fetch(`/api/chapters/${chapterNum}`);
      if (response.ok) {
        const data = await response.json();
        if (data.chapter) {
          setChapterTitle(data.chapter.title);
        }
      }
    } catch (err) {
      console.error("Error fetching chapter data:", err);
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? (
            <p className="text-xl md:text-2xl text-white mb-6">Loading...</p>
          ) : (
            <>
              <p className="text-xl md:text-2xl text-white mb-6">
                You&apos;ve completed Chapter {chapterNumber}!
              </p>
              {chapterTitle && (
                <p className="text-lg md:text-xl text-blue-300 mb-4">
                  {chapterTitle}
                </p>
              )}
              <p className="text-gray-300 mb-8">
                Great job! You&apos;ve successfully completed Chapter {chapterNumber} of your
                Florida Real Estate Sales Associate pre-license education course.
                {chapterNumber && chapterNumber > 1 && " Keep up the excellent work!"}
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {chapterNumber && (
              <button
                onClick={() => router.push(`/chapter/${chapterNumber}`)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
              >
                Review Chapter
              </button>
            )}
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

export default function CongratulationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center p-4">
        <Header />
        <StarsBackground />
        <div className="relative z-10 text-center">
          <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-8 md:p-12 shadow-2xl">
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <CongratulationsContent />
    </Suspense>
  );
}

