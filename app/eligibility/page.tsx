"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import StarsBackground from "@/components/StarsBackground";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

export default function EligibilityPage() {
  const router = useRouter();
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEligibilityQuestions();
  }, []);

  const fetchEligibilityQuestions = async () => {
    try {
      const response = await fetch("/api/admin/quiz-questions?quizType=eligibility");
      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          setQuizQuestions(data.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })));
        } else {
          // Fallback to empty array - admin needs to add questions
          console.warn("No eligibility questions found in database");
        }
      }
    } catch (err) {
      console.error("Error fetching eligibility questions:", err);
    } finally {
      setLoading(false);
    }
  };

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
    router.push("/chapter/1");
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
          {loading ? (
            <div className="text-white text-center">Loading quiz questions...</div>
          ) : quizQuestions.length > 0 ? (
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} />
          ) : (
            <div className="text-white text-center p-8 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-lg mb-2">No quiz questions available</p>
              <p className="text-sm text-gray-400">Please contact an administrator to add eligibility quiz questions.</p>
            </div>
          )}
        </div>
      </div>
    </main>
    </AuthGuard>
  );
}

