"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MrListings from "@/components/MrListings";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import StarsBackground from "@/components/StarsBackground";
import TableOfContents from "@/components/TableOfContents";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

// Lazy load AudioPlayer to improve initial page load
const AudioPlayer = dynamic(() => import("@/components/AudioPlayer"), {
  ssr: false,
  loading: () => <div className="text-white">Loading audio player...</div>
});

interface Section {
  id: string;
  title: string;
  text?: string;
  type: string;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
}

export default function Chapter1Page() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<string>("objectives");
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [keyTerms, setKeyTerms] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    fetchChapterData();
  }, []);

  const fetchChapterData = async () => {
    try {
      // Fetch chapter 1 data from database
      const response = await fetch("/api/chapters/1");
      if (response.ok) {
        const data = await response.json();
        setChapterData(data.chapter);
        
        // Set learning objectives
        if (data.chapter.learningObjectives) {
          setLearningObjectives(data.chapter.learningObjectives.map((obj: any) => obj.text));
        }
        
        // Set key terms
        if (data.chapter.keyTerms) {
          setKeyTerms(data.chapter.keyTerms.map((term: any) => term.term));
        }
        
        // Build sections array from database
        const dbSections: Section[] = [];
        
        // Add objectives section
        if (data.chapter.learningObjectives && data.chapter.learningObjectives.length > 0) {
          dbSections.push({
            id: "objectives",
            title: "Learning Objectives",
            type: "objectives",
          });
        }
        
        // Add key terms section
        if (data.chapter.keyTerms && data.chapter.keyTerms.length > 0) {
          dbSections.push({
            id: "key-terms",
            title: "Key Terms",
            type: "key-terms",
          });
        }
        
        // Add ALL content sections (don't filter by type)
        if (data.chapter.sections) {
          data.chapter.sections.forEach((section: any) => {
            // Only add sections that are not objectives or key-terms (those are handled separately)
            if (section.type !== 'objectives' && section.type !== 'key-terms' && section.type !== 'introduction') {
              dbSections.push({
                id: section.id,
                title: section.title,
                text: section.text,
                type: section.type || 'content',
                audioUrl: section.audioUrl,
                timestampsUrl: section.timestampsUrl,
              });
            }
          });
        }
        
        setSections(dbSections);
        
        // Set quiz questions
        if (data.chapter.quizQuestions) {
          setQuizQuestions(data.chapter.quizQuestions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })));
        }
      } else {
        // Fallback to hardcoded data if database doesn't have chapter 1 yet
        console.warn("Chapter 1 not found in database, using fallback data");
        setLearningObjectives([
          "Describe the various activities of real estate brokerage",
          "Distinguish among the five major sales specialties",
          "Identify the role of property managers",
          "Describe activities that require appraiser services and distinguish among CMA, BPO, and appraisal",
          "Understand the mortgage process and the role of mortgage loan originator",
          "Explain the three phases of development and construction",
          "Distinguish among the three categories of residential construction"
        ]);
        setKeyTerms([
          "absentee owner",
          "appraisal",
          "appraiser",
          "broker price opinion (BPO)",
          "business broker",
          "business opportunity",
          "community association manager (CAM)",
          "comparative market analysis (CMA)",
          "dedication",
          "farm area (target market)"
        ]);
        // Use fallback sections
        setSections([
          { id: "objectives", title: "Learning Objectives", type: "objectives" },
          { id: "key-terms", title: "Key Terms", type: "key-terms" },
          // Add more fallback sections if needed
        ]);
      }
    } catch (err) {
      console.error("Error fetching chapter data:", err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = useMemo(() => [
    { id: "intro", title: "Introduction", path: "/introduction" },
    { id: "chapter1", title: chapterData ? `Chapter ${chapterData.number}. ${chapterData.title}` : "Chapter 1. The Real Estate Business", path: "/chapter-1" },
  ], [chapterData]);

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id);
    } else {
      setShowQuiz(true);
    }
  };

  const handlePrevious = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id);
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

  const currentSectionData = sections.find(s => s.id === currentSection);
  const currentIndex = sections.findIndex(s => s.id === currentSection);

  if (showQuiz) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <TableOfContents items={menuItems} currentPath="/chapter-1" />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            {chapterData ? `Chapter ${chapterData.number} Quiz` : "Chapter 1 Quiz"}
          </h1>
          {quizQuestions.length > 0 ? (
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} />
          ) : (
            <div className="text-white">No quiz questions available yet.</div>
          )}
        </div>
      </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <TableOfContents items={menuItems} currentPath="/chapter-1" />

        <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <MrListings size="small" isLecturing={true} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              FLORIDA REAL ESTATE SALES ASSOCIATE COURSE
            </h1>
            <p className="text-blue-300 text-lg md:text-xl">
              {chapterData ? `Chapter ${chapterData.number}: ${chapterData.title}` : "Chapter 1: The Real Estate Business"}
            </p>
            {chapterData?.description && (
              <p className="text-gray-300 text-base md:text-lg mt-2 max-w-3xl mx-auto">
                {chapterData.description}
              </p>
            )}
            <div className="mt-4 text-sm text-gray-400">
              Section {currentIndex + 1} of {sections.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl animate-scale-in">
              {currentSectionData?.type === "objectives" ? (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                    Learning Objectives
                  </h2>
                  <div className="space-y-4">
                    {learningObjectives.map((objective, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-[#0a1a2e] rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 animate-slide-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="text-white text-base md:text-lg flex-1">{objective}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : currentSectionData?.type === "key-terms" ? (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                    Key Terms you will learn about:
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keyTerms.map((term, index) => (
                      <div
                        key={index}
                        className="p-4 bg-[#0a1a2e] rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 animate-scale-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <p className="text-blue-300 font-semibold text-base md:text-lg">{term}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                    {currentSectionData?.title}
                  </h2>
                  {currentSectionData?.text && (
                    <AudioPlayer
                      text={currentSectionData.text}
                      audioUrl={currentSectionData.audioUrl || undefined}
                      timestampsUrl={currentSectionData.timestampsUrl || undefined}
                      autoPlay={true}
                      onComplete={() => {}}
                    />
                  )}
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {currentIndex < sections.length - 1 ? "Next Section" : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    </AuthGuard>
  );
}
