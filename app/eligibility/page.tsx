"use client";

import { useRouter } from "next/navigation";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import { eligibilityQuestions } from "@/lib/quizData";
import StarsBackground from "@/components/StarsBackground";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

export default function EligibilityPage() {
  const router = useRouter();

  const handleQuizComplete = (score: number, total: number) => {
    // Save progress
    const progress = {
      chapter: 1,
      section: "eligibility",
      score,
      total,
      completed: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("progress", JSON.stringify(progress));

    // Navigate to congratulations or next section
    router.push("/chapter-1");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden p-4 md:p-8">
        <Header />
        {/* Stars background */}
        <StarsBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            Eligibility Quiz
          </h1>
          <Quiz questions={eligibilityQuestions} onComplete={handleQuizComplete} />
        </div>
      </div>
    </main>
    </AuthGuard>
  );
}

