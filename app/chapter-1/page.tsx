"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MrListings from "@/components/MrListings";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import StarsBackground from "@/components/StarsBackground";
import TableOfContents from "@/components/TableOfContents";
import Header from "@/components/Header";
import RegistrationPrompt from "@/components/RegistrationPrompt";
import { highlightText, highlightTextArray } from "@/lib/highlightText";

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
  const [currentSection, setCurrentSection] = useState<string>("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [searchHighlight, setSearchHighlight] = useState<string>("");
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [activePlayingSectionId, setActivePlayingSectionId] = useState<string | null>(null);
  const [hasAutoPlayedFirst, setHasAutoPlayedFirst] = useState(false);

  useEffect(() => {
    fetchChapterData();
    
    // Check for search highlight query from search results
    const searchQuery = sessionStorage.getItem('searchHighlight');
    if (searchQuery) {
      setSearchHighlight(searchQuery);
      // Clear after a delay to allow highlighting to be applied
      setTimeout(() => {
        sessionStorage.removeItem('searchHighlight');
      }, 5000); // Clear after 5 seconds
    }
    
    // Listen for section navigation events from TableOfContents
    const handleNavigateToSection = (event: CustomEvent) => {
      const sectionId = event.detail?.sectionId;
      if (sectionId) {
        if (sectionId === 'quiz') {
          // Show quiz if target is quiz
          setShowQuiz(true);
        } else {
          setCurrentSection(sectionId);
        }
      }
    };
    
    // Check sessionStorage for target section (from search results)
    const checkTargetSection = () => {
      const targetSection = sessionStorage.getItem('targetSection');
      if (targetSection) {
        // Don't remove immediately - wait until we've successfully navigated
        if (targetSection === 'quiz') {
          // Show quiz if target is quiz
          setShowQuiz(true);
          sessionStorage.removeItem('targetSection');
        } else {
          // For regular sections, wait for sections to be loaded
          // This will be handled in fetchChapterData
          // Keep the targetSection in sessionStorage for now
        }
      }
    };
    
    // Check immediately
    checkTargetSection();
    
    window.addEventListener('navigateToSection', handleNavigateToSection as EventListener);
    
    return () => {
      window.removeEventListener('navigateToSection', handleNavigateToSection as EventListener);
    };
  }, []);

  const fetchChapterData = async () => {
    try {
      // Fetch chapter 1 data from database
      const response = await fetch("/api/chapters/1");
      if (response.ok) {
        const data = await response.json();
        setChapterData(data.chapter);
        
        // Build sections array from database
        const dbSections: Section[] = [];
        
        // Add ALL content sections (don't filter by type)
        if (data.chapter.sections) {
          data.chapter.sections.forEach((section: any) => {
            // Only add sections that are not introduction
            if (section.type !== 'introduction') {
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
        
        // Set current section to first section if available
        if (dbSections.length > 0 && !currentSection) {
          setCurrentSection(dbSections[0].id);
        }
        
        // After sections are loaded, check if we need to navigate to a specific section
        const targetSection = sessionStorage.getItem('targetSection');
        if (targetSection) {
          if (targetSection === 'quiz') {
            setShowQuiz(true);
            sessionStorage.removeItem('targetSection');
            setActivePlayingSectionId(null);
          } else {
            // Check if the target section exists in the loaded sections
            const sectionExists = dbSections.some(s => s.id === targetSection);
            if (sectionExists) {
              setCurrentSection(targetSection);
              sessionStorage.removeItem('targetSection');
              // Clear any previous playing section highlight
              setActivePlayingSectionId(null);
            } else {
              // Section not found, clear the target and use first section
              sessionStorage.removeItem('targetSection');
              if (dbSections.length > 0) {
                setCurrentSection(dbSections[0].id);
              }
            }
          }
        }
        
        // Set quiz questions
        if (data.chapter.quizQuestions) {
          setQuizQuestions(data.chapter.quizQuestions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            audioUrl: q.audioUrl, // Legacy combined audio (deprecated)
            timestampsUrl: q.timestampsUrl, // Legacy combined timestamps (deprecated)
            questionAudioUrl: q.questionAudioUrl, // New: separate question audio
            questionTimestampsUrl: q.questionTimestampsUrl, // New: separate question timestamps
            optionAudioUrls: q.optionAudioUrls, // New: array of option audio URLs
            optionTimestampsUrls: q.optionTimestampsUrls, // New: array of option timestamps URLs
            explanationAudioUrl: q.explanationAudioUrl, // Legacy (deprecated)
            explanationTimestampsUrl: q.explanationTimestampsUrl, // Legacy (deprecated)
            correctExplanationAudioUrl: q.correctExplanationAudioUrl,
            correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
            incorrectExplanationAudioUrls: q.incorrectExplanationAudioUrls,
            incorrectExplanationTimestampsUrls: q.incorrectExplanationTimestampsUrls,
          })));
        }
      } else {
        // Fallback to hardcoded data if database doesn't have chapter 1 yet
        console.warn("Chapter 1 not found in database, using fallback data");
        // Use fallback sections (empty for now)
        setSections([]);
      }
    } catch (err) {
      console.error("Error fetching chapter data:", err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = useMemo(() => {
    const items: Array<{ 
      id: string; 
      title: string; 
      path: string; 
      sectionId?: string;
      isChapter?: boolean;
      children?: Array<{ id: string; title: string; path: string; sectionId?: string }>;
    }> = [
      { id: "intro", title: "Introduction", path: "/introduction" },
    ];
    
    // Add chapter with sections as children
    if (chapterData) {
      const chapterSections = sections.map((section, index) => ({
        id: `section-${section.id}`,
        title: `${index + 1}. ${section.title}`,
        path: "/chapter-1",
        sectionId: section.id,
      }));
      
      items.push({
        id: "chapter1",
        title: `Chapter ${chapterData.number}. ${chapterData.title}`,
        path: "/chapter-1",
        isChapter: true,
        children: chapterSections,
      });
    } else {
      // Fallback if chapter data not loaded yet
      items.push({
        id: "chapter1",
        title: "Chapter 1. The Real Estate Business",
        path: "/chapter-1",
        isChapter: true,
        children: [],
      });
    }
    
    return items;
  }, [chapterData, sections]);

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
    
    // Check if user is authenticated
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
    
    if (!token) {
      // User is not authenticated - show registration prompt
      setQuizScore({ score, total });
      setShowRegistrationPrompt(true);
    } else {
      // User is authenticated - go to congratulations
      router.push("/congratulations");
    }
  };

  const currentSectionData = sections.find(s => s.id === currentSection);
  const currentIndex = sections.findIndex(s => s.id === currentSection);

  // Normalize word for matching (same as AudioPlayer)
  const normalizeWord = (word: string) => {
    return word.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
  };

  // Helper to remove all highlights from an element
  const removeHighlights = (element: HTMLElement | null) => {
    if (!element) return;
    const highlighted = element.querySelectorAll('span[data-audio-highlight]');
    highlighted.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent || ''), span);
        parent.normalize();
      }
    });
  };

  // Highlight a specific word at a specific position in an element
  // Also accepts an optional targetWord to match by content if position doesn't work
  const highlightWordAtPosition = (element: HTMLElement, targetPositionInElement: number, targetWord?: string) => {
    // Remove previous highlights from this element
    removeHighlights(element);

    if (targetPositionInElement < 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid target position:', targetPositionInElement);
      }
      return;
    }

    // Get the full text and split it the same way we count words
    const fullText = element.textContent || '';
    // Split exactly like AudioPlayer: split(/\s+/).filter(word => word.length > 0)
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    
    // If position is out of range, try to match by word content if targetWord is provided
    if (targetPositionInElement >= words.length && targetWord) {
      // Try to find the word by matching normalized content
      const normalizedTarget = normalizeWord(targetWord);
      for (let i = 0; i < words.length; i++) {
        if (normalizeWord(words[i]) === normalizedTarget) {
          targetPositionInElement = i;
          if (process.env.NODE_ENV === 'development') {
            console.log('Matched word by content instead of position:', {
              originalPosition: targetPositionInElement,
              matchedPosition: i,
              targetWord,
              matchedWord: words[i],
            });
          }
          break;
        }
      }
    }
    
    if (targetPositionInElement >= words.length) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Target position out of range:', {
          targetPositionInElement,
          wordsLength: words.length,
          fullText,
          words,
          targetWord,
        });
      }
      return;
    }

    // Now highlight the word at the specific position in this element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        textNodes.push(node as Text);
      }
    }

    let currentWordPosition = 0;
    let highlighted = false;
    
    textNodes.forEach((textNode) => {
      if (highlighted) return; // Already highlighted, skip remaining nodes
      
      const text = textNode.textContent || '';
      // Split preserving spaces for reconstruction
      const parts = text.split(/(\s+)/);
      
      let newHTML = '';
      parts.forEach((part) => {
        if (part.trim()) {
          // This is a word
          if (currentWordPosition === targetPositionInElement && !highlighted) {
            // This is the word we want to highlight
            newHTML += `<span data-audio-highlight style="background: linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%); background-size: 100% 85%; background-position: center; background-repeat: no-repeat; color: #fef08a; border-radius: 3px; text-shadow: 0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5); transition: background 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;">${part}</span>`;
            highlighted = true;
          } else {
            newHTML += part;
          }
          currentWordPosition++;
        } else {
          newHTML += part; // Keep whitespace
        }
      });

      if (newHTML !== text && highlighted) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });
    
    if (process.env.NODE_ENV === 'development' && !highlighted) {
      console.warn('Word not highlighted:', {
        targetPositionInElement,
        wordsLength: words.length,
        fullText,
        words,
        targetWord,
      });
    }
  };

  // Store the audio text words for mapping
  const audioWordsRef = useRef<string[]>([]);

  // Auto-advance to next section when audio completes
  const handleAudioComplete = () => {
    setActivePlayingSectionId(null);
    
    // Auto-advance to next section
    if (currentIndex < sections.length - 1) {
      // Small delay before advancing to next section
      setTimeout(() => {
        const nextSection = sections[currentIndex + 1];
        setCurrentSection(nextSection.id);
        // Reset flag so next section can auto-play
        setHasAutoPlayedFirst(false);
      }, 500);
    } else {
      // Last section completed, show quiz
      setTimeout(() => {
        setShowQuiz(true);
      }, 500);
    }
  };

  // Track section changes to enable auto-play
  useEffect(() => {
    if (!loading && sections.length > 0 && currentSection) {
      // Reset flag when section changes to allow auto-play
      // This works for both first section and auto-advanced sections
      setHasAutoPlayedFirst(false);
    }
  }, [currentSection, sections, loading]);

  if (showQuiz) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <TableOfContents items={menuItems} currentPath="/chapter-1" activeSectionId={activePlayingSectionId || undefined} />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            {chapterData ? `Chapter ${chapterData.number} Quiz` : "Chapter 1 Quiz"}
          </h1>
          {quizQuestions.length > 0 ? (
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} searchHighlight={searchHighlight} />
          ) : (
            <div className="text-white">No quiz questions available yet.</div>
          )}
        </div>
        {showRegistrationPrompt && quizScore && (
          <RegistrationPrompt
            score={quizScore.score}
            total={quizScore.total}
            onRegister={() => {
              setShowRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", "/congratulations");
              router.push("/signup");
            }}
            onLogin={() => {
              setShowRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", "/congratulations");
              router.push("/login");
            }}
            onSkip={() => {
              setShowRegistrationPrompt(false);
              router.push("/congratulations");
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <TableOfContents items={menuItems} currentPath="/chapter-1" activeSectionId={activePlayingSectionId || undefined} />

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
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                  {currentSectionData?.title}
                </h2>
                {currentSectionData?.text && (
                  <AudioPlayer
                    text={currentSectionData.text}
                    audioUrl={currentSectionData.audioUrl || undefined}
                    timestampsUrl={currentSectionData.timestampsUrl || undefined}
                    autoPlay={!hasAutoPlayedFirst && !!currentSectionData.audioUrl}
                    onComplete={handleAudioComplete}
                    onPlayingChange={(isPlaying) => {
                      // Track when audio starts/stops playing
                      if (isPlaying) {
                        setActivePlayingSectionId(currentSection);
                      } else {
                        setActivePlayingSectionId(null);
                      }
                    }}
                    highlightQuery={searchHighlight}
                  />
                )}
                {currentSectionData && !currentSectionData.audioUrl && (
                  <div className="text-yellow-400 text-sm mt-4">
                    ⚠️ Audio not available for this section yet. Please generate audio in the admin panel.
                  </div>
                )}
              </>
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
                {currentIndex < sections.length - 1 ? "Next" : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
