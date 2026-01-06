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
  const [currentSection, setCurrentSection] = useState<string>("objectives");
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [learningObjectives, setLearningObjectives] = useState<Array<{ text: string; audioUrl?: string | null; timestampsUrl?: string | null }>>([]);
  const [keyTerms, setKeyTerms] = useState<Array<{ term: string; audioUrl?: string | null; timestampsUrl?: string | null }>>([]);
  const [objectivesAudioUrl, setObjectivesAudioUrl] = useState<string | null>(null);
  const [objectivesTimestampsUrl, setObjectivesTimestampsUrl] = useState<string | null>(null);
  const [keyTermsAudioUrl, setKeyTermsAudioUrl] = useState<string | null>(null);
  const [keyTermsTimestampsUrl, setKeyTermsTimestampsUrl] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [searchHighlight, setSearchHighlight] = useState<string>("");
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [activePlayingSectionId, setActivePlayingSectionId] = useState<string | null>(null);
  const [hasAutoPlayedFirst, setHasAutoPlayedFirst] = useState(false);
  const objectivesRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keyTermsRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        } else if (targetSection === 'objectives' || targetSection === 'key-terms') {
          // These are special sections that should always exist
          setCurrentSection(targetSection);
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
        
        // Set learning objectives with audio data
        if (data.chapter.learningObjectives) {
          setLearningObjectives(data.chapter.learningObjectives.map((obj: any) => ({
            text: obj.text,
            audioUrl: obj.audioUrl,
            timestampsUrl: obj.timestampsUrl,
          })));
          // Check if there's a combined audio for all objectives (stored in chapter or first objective)
          // For now, we'll use the first objective's audio if available, or chapter-level audio
          const firstObj = data.chapter.learningObjectives[0];
          if (firstObj?.audioUrl) {
            setObjectivesAudioUrl(firstObj.audioUrl);
            setObjectivesTimestampsUrl(firstObj.timestampsUrl || null);
          }
        }
        
        // Set key terms with audio data
        if (data.chapter.keyTerms) {
          setKeyTerms(data.chapter.keyTerms.map((term: any) => ({
            term: term.term,
            audioUrl: term.audioUrl,
            timestampsUrl: term.timestampsUrl,
          })));
          // Check if there's a combined audio for all key terms
          const firstTerm = data.chapter.keyTerms[0];
          if (firstTerm?.audioUrl) {
            setKeyTermsAudioUrl(firstTerm.audioUrl);
            setKeyTermsTimestampsUrl(firstTerm.timestampsUrl || null);
          }
        }
        
        // Build sections array from database
        const dbSections: Section[] = [];
        
        // Add objectives section with audio
        if (data.chapter.learningObjectives && data.chapter.learningObjectives.length > 0) {
          const firstObj = data.chapter.learningObjectives[0];
          dbSections.push({
            id: "objectives",
            title: "Learning Objectives",
            type: "objectives",
            text: data.chapter.learningObjectives.map((obj: any) => obj.text).join(". "),
            audioUrl: firstObj?.audioUrl || null,
            timestampsUrl: firstObj?.timestampsUrl || null,
          });
        }
        
        // Add key terms section with audio
        if (data.chapter.keyTerms && data.chapter.keyTerms.length > 0) {
          const firstTerm = data.chapter.keyTerms[0];
          dbSections.push({
            id: "key-terms",
            title: "Key Terms",
            type: "key-terms",
            text: data.chapter.keyTerms.map((term: any) => term.term).join(". "),
            audioUrl: firstTerm?.audioUrl || null,
            timestampsUrl: firstTerm?.timestampsUrl || null,
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
        
        // After sections are loaded, check if we need to navigate to a specific section
        const targetSection = sessionStorage.getItem('targetSection');
        if (targetSection) {
          if (targetSection === 'quiz') {
            setShowQuiz(true);
            sessionStorage.removeItem('targetSection');
            setActivePlayingSectionId(null);
          } else {
            // Check if the target section exists in the loaded sections (including objectives and key-terms)
            const sectionExists = dbSections.some(s => s.id === targetSection) || 
                                  targetSection === 'objectives' || 
                                  targetSection === 'key-terms';
            if (sectionExists) {
              setCurrentSection(targetSection);
              sessionStorage.removeItem('targetSection');
              // Clear any previous playing section highlight
              setActivePlayingSectionId(null);
            } else {
              // Section not found, clear the target
              sessionStorage.removeItem('targetSection');
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
            audioUrl: q.audioUrl,
            timestampsUrl: q.timestampsUrl,
            explanationAudioUrl: q.explanationAudioUrl,
            explanationTimestampsUrl: q.explanationTimestampsUrl,
            correctExplanationAudioUrl: q.correctExplanationAudioUrl,
            correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
            incorrectExplanationAudioUrls: q.incorrectExplanationAudioUrls,
            incorrectExplanationTimestampsUrls: q.incorrectExplanationTimestampsUrls,
          })));
        }
      } else {
        // Fallback to hardcoded data if database doesn't have chapter 1 yet
        console.warn("Chapter 1 not found in database, using fallback data");
        const fallbackObjectives = [
          "Describe the various activities of real estate brokerage",
          "Distinguish among the five major sales specialties",
          "Identify the role of property managers",
          "Describe activities that require appraiser services and distinguish among CMA, BPO, and appraisal",
          "Understand the mortgage process and the role of mortgage loan originator",
          "Explain the three phases of development and construction",
          "Distinguish among the three categories of residential construction"
        ];
        setLearningObjectives(fallbackObjectives.map(text => ({ text })));
        const fallbackKeyTerms = [
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
        ];
        setKeyTerms(fallbackKeyTerms.map(term => ({ term })));
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

  // Handle word highlighting from AudioPlayer for objectives
  const handleObjectivesHighlightedWord = (word: string, wordIndex: number) => {
    // Ensure refs are initialized - if not, try to initialize them
    if (objectivesRefs.current.length === 0 && learningObjectives.length > 0) {
      objectivesRefs.current = new Array(learningObjectives.length).fill(null);
      // Force a re-render to populate refs (this is a fallback)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Objectives refs not initialized, attempting to initialize');
      }
    }
    
    // First, remove all highlights from all objectives
    objectivesRefs.current.forEach((ref) => {
      if (ref) {
        removeHighlights(ref);
      }
    });

    // Get the full audio text EXACTLY as passed to AudioPlayer
    // AudioPlayer uses: text.split(/\s+/).filter(word => word.length > 0)
    const audioText = currentSectionData?.text || learningObjectives.map(obj => obj.text).join(". ");
    const audioWords = audioText.split(/\s+/).filter(w => w.length > 0);
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Objectives Highlighting:', {
        word,
        wordIndex,
        audioText,
        audioWordsLength: audioWords.length,
        audioWordAtIndex: audioWords[wordIndex],
        objectivesCount: learningObjectives.length,
      });
    }
    
    // Calculate which objective this word belongs to and its position within that objective
    // We need to match EXACTLY how AudioPlayer splits the text
    // When joining with ". ", the period attaches to the last word: "obj1. obj2" -> ["obj1.", "obj2"]
    let cumulativeWordCount = 0;
    let foundElementIndex = -1;
    let targetPositionInElement = -1;
    
    for (let i = 0; i < learningObjectives.length; i++) {
      const objText = learningObjectives[i].text;
      // Split EXACTLY the same way AudioPlayer does
      const objWords = objText.split(/\s+/).filter(w => w.length > 0);
      const objWordCount = objWords.length;
      
      // Check if wordIndex falls within this objective's range
      // The period from ". " separator attaches to the last word of the previous objective
      // So "obj1. obj2" splits to ["obj1.", "obj2"] - the period is part of "obj1."
      if (wordIndex >= cumulativeWordCount && wordIndex < cumulativeWordCount + objWordCount) {
        foundElementIndex = i;
        targetPositionInElement = wordIndex - cumulativeWordCount;
        if (process.env.NODE_ENV === 'development') {
          console.log('Found objective match:', {
            objectiveIndex: i,
            objText,
            targetPositionInElement,
            cumulativeWordCount,
            objWordCount,
            audioWord: audioWords[wordIndex],
          });
        }
        break;
      }
      
      cumulativeWordCount += objWordCount;
      // When joining with ". ", the period attaches to the last word of each objective (except last)
      // So "obj1. obj2" -> ["obj1.", "obj2"] - no extra word count needed
      // The period is already part of the last word of the previous objective
    }

    // Highlight only in the correct element
    if (foundElementIndex >= 0 && foundElementIndex < objectivesRefs.current.length) {
      const targetRef = objectivesRefs.current[foundElementIndex];
      if (targetRef) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Highlighting objective:', {
            foundElementIndex,
            targetPositionInElement,
            elementText: targetRef.textContent,
            word,
            wordIndex,
          });
        }
        highlightWordAtPosition(targetRef, targetPositionInElement, word);
      } else {
        // Ref not ready yet - try again after a short delay
        // This handles the case where audio starts before React has finished rendering
        if (process.env.NODE_ENV === 'development') {
          console.warn('Target ref not ready for objective index, retrying:', foundElementIndex);
        }
        setTimeout(() => {
          const retryRef = objectivesRefs.current[foundElementIndex];
          if (retryRef) {
            highlightWordAtPosition(retryRef, targetPositionInElement, word);
          }
        }, 50);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('No objective match found for wordIndex:', wordIndex, {
          foundElementIndex,
          objectivesRefsLength: objectivesRefs.current.length,
          objectivesLength: learningObjectives.length,
          audioWords,
          cumulativeWordCount,
        });
      }
    }
  };

  // Handle word highlighting from AudioPlayer for key terms
  const handleKeyTermsHighlightedWord = (word: string, wordIndex: number) => {
    // Ensure refs are initialized - if not, try to initialize them
    if (keyTermsRefs.current.length === 0 && keyTerms.length > 0) {
      keyTermsRefs.current = new Array(keyTerms.length).fill(null);
      // Force a re-render to populate refs (this is a fallback)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Key terms refs not initialized, attempting to initialize');
      }
    }
    
    // First, remove all highlights from all key terms
    keyTermsRefs.current.forEach((ref) => {
      if (ref) {
        removeHighlights(ref);
      }
    });

    // Get the full audio text EXACTLY as passed to AudioPlayer
    // AudioPlayer uses: text.split(/\s+/).filter(word => word.length > 0)
    const audioText = currentSectionData?.text || keyTerms.map(term => term.term).join(". ");
    const audioWords = audioText.split(/\s+/).filter(w => w.length > 0);
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Key Terms Highlighting:', {
        word,
        wordIndex,
        audioText,
        audioWordsLength: audioWords.length,
        audioWordAtIndex: audioWords[wordIndex],
        keyTermsCount: keyTerms.length,
        keyTerms: keyTerms.map(t => t.term),
      });
    }
    
    // Calculate which key term this word belongs to and its position within that term
    // We need to match EXACTLY how AudioPlayer splits the text
    // When joining with ". ", the period attaches to the last word: "term1. term2" -> ["term1.", "term2"]
    let cumulativeWordCount = 0;
    let foundElementIndex = -1;
    let targetPositionInElement = -1;
    
    for (let i = 0; i < keyTerms.length; i++) {
      const termText = keyTerms[i].term;
      // Split EXACTLY the same way AudioPlayer does
      const termWords = termText.split(/\s+/).filter(w => w.length > 0);
      const termWordCount = termWords.length;
      
      // Check if wordIndex falls within this term's range
      // The period from ". " separator attaches to the last word of the previous term
      // So "term1. term2" splits to ["term1.", "term2"] - the period is part of "term1."
      if (wordIndex >= cumulativeWordCount && wordIndex < cumulativeWordCount + termWordCount) {
        foundElementIndex = i;
        targetPositionInElement = wordIndex - cumulativeWordCount;
        if (process.env.NODE_ENV === 'development') {
          console.log('Found key term match:', {
            termIndex: i,
            termText,
            targetPositionInElement,
            cumulativeWordCount,
            termWordCount,
            audioWord: audioWords[wordIndex],
          });
        }
        break;
      }
      
      cumulativeWordCount += termWordCount;
      // When joining with ". ", the period attaches to the last word of each term (except last)
      // So "term1. term2" -> ["term1.", "term2"] - no extra word count needed
      // The period is already part of the last word of the previous term
    }

    // Highlight only in the correct element
    if (foundElementIndex >= 0 && foundElementIndex < keyTermsRefs.current.length) {
      const targetRef = keyTermsRefs.current[foundElementIndex];
      if (targetRef) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Highlighting key term:', {
            foundElementIndex,
            targetPositionInElement,
            elementText: targetRef.textContent,
            word,
            wordIndex,
          });
        }
        highlightWordAtPosition(targetRef, targetPositionInElement, word);
      } else {
        // Ref not ready yet - try again after a short delay
        // This handles the case where audio starts before React has finished rendering
        if (process.env.NODE_ENV === 'development') {
          console.warn('Target ref not ready for key term index, retrying:', foundElementIndex);
        }
        setTimeout(() => {
          const retryRef = keyTermsRefs.current[foundElementIndex];
          if (retryRef) {
            highlightWordAtPosition(retryRef, targetPositionInElement, word);
          }
        }, 50);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('No key term match found for wordIndex:', wordIndex, {
          foundElementIndex,
          keyTermsRefsLength: keyTermsRefs.current.length,
          keyTermsLength: keyTerms.length,
          audioWords,
          cumulativeWordCount,
        });
      }
    }
  };

  // Reset highlights and initialize refs arrays when section changes
  useEffect(() => {
    objectivesRefs.current.forEach(removeHighlights);
    keyTermsRefs.current.forEach(removeHighlights);
    
    // Initialize refs arrays with correct length based on current section
    if (currentSection === 'objectives' && learningObjectives.length > 0) {
      objectivesRefs.current = new Array(learningObjectives.length).fill(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('Initialized objectives refs:', learningObjectives.length);
      }
    } else {
      objectivesRefs.current = [];
    }
    
    if (currentSection === 'key-terms' && keyTerms.length > 0) {
      keyTermsRefs.current = new Array(keyTerms.length).fill(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('Initialized key terms refs:', keyTerms.length);
      }
    } else {
      keyTermsRefs.current = [];
    }
  }, [currentSection, learningObjectives.length, keyTerms.length]);

  // Additional effect to ensure refs are ready after render
  useEffect(() => {
    // Small delay to ensure DOM elements are rendered and refs are populated
    const timer = setTimeout(() => {
      if (currentSection === 'key-terms' && keyTerms.length > 0) {
        const refsReady = keyTermsRefs.current.every((ref, idx) => {
          // Check if ref exists or if we're still waiting for it
          return ref !== null || idx >= keyTerms.length;
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('Key terms refs check:', {
            refsReady,
            refsLength: keyTermsRefs.current.length,
            keyTermsLength: keyTerms.length,
            refs: keyTermsRefs.current.map((r, i) => ({ index: i, hasRef: r !== null })),
          });
        }
      }
      
      if (currentSection === 'objectives' && learningObjectives.length > 0) {
        const refsReady = objectivesRefs.current.every((ref, idx) => {
          return ref !== null || idx >= learningObjectives.length;
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('Objectives refs check:', {
            refsReady,
            refsLength: objectivesRefs.current.length,
            objectivesLength: learningObjectives.length,
            refs: objectivesRefs.current.map((r, i) => ({ index: i, hasRef: r !== null })),
          });
        }
      }
    }, 100); // Small delay to allow React to finish rendering
    
    return () => clearTimeout(timer);
  }, [currentSection, keyTerms, learningObjectives]);

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
              {currentSectionData?.type === "objectives" ? (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                    Learning Objectives
                  </h2>
                  <div className="space-y-4 mb-6">
                    {learningObjectives.map((objective, index) => {
                      // Ensure refs array is initialized with correct length
                      if (objectivesRefs.current.length < learningObjectives.length) {
                        objectivesRefs.current = new Array(learningObjectives.length).fill(null);
                      }
                      
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 bg-[#0a1a2e] rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 animate-slide-up"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <p 
                            className="text-white text-base md:text-lg flex-1"
                            ref={(el) => {
                              if (el) {
                                objectivesRefs.current[index] = el;
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('Objective ref set:', { index, text: objective.text, refsLength: objectivesRefs.current.length });
                                }
                              }
                            }}
                          >
                            {searchHighlight ? highlightText(objective.text, searchHighlight) : objective.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {currentSectionData?.audioUrl && (
                    <div className="pt-4 border-t border-blue-500/20">
                      <AudioPlayer
                        text={currentSectionData.text || learningObjectives.map(obj => obj.text).join(". ")}
                        audioUrl={currentSectionData.audioUrl || undefined}
                        timestampsUrl={currentSectionData.timestampsUrl || undefined}
                        autoPlay={!hasAutoPlayedFirst}
                        onComplete={handleAudioComplete}
                        onPlayingChange={(isPlaying) => {
                          if (isPlaying) {
                            setActivePlayingSectionId(currentSection);
                            // Mark as played to prevent auto-play from triggering again for this section
                            setHasAutoPlayedFirst(true);
                          } else {
                            // Clear active section when paused
                            // Note: Audio completion is handled by onComplete callback
                            setActivePlayingSectionId(null);
                          }
                        }}
                        hideText={true}
                        onHighlightedWord={handleObjectivesHighlightedWord}
                        highlightQuery={searchHighlight}
                      />
                    </div>
                  )}
                </>
              ) : currentSectionData?.type === "key-terms" ? (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
                    Key Terms you will learn about:
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {keyTerms.map((term, index) => {
                      // Ensure refs array is initialized with correct length
                      if (keyTermsRefs.current.length < keyTerms.length) {
                        keyTermsRefs.current = new Array(keyTerms.length).fill(null);
                      }
                      
                      return (
                        <div
                          key={index}
                          className="p-4 bg-[#0a1a2e] rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 animate-scale-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <p 
                            className="text-blue-300 font-semibold text-base md:text-lg"
                            ref={(el) => {
                              if (el) {
                                keyTermsRefs.current[index] = el;
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('Key term ref set:', { index, term: term.term, refsLength: keyTermsRefs.current.length });
                                }
                              }
                            }}
                          >
                            {searchHighlight ? highlightText(term.term, searchHighlight) : term.term}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {currentSectionData?.audioUrl && (
                    <div className="pt-4 border-t border-blue-500/20">
                      <AudioPlayer
                        text={currentSectionData.text || keyTerms.map(term => term.term).join(". ")}
                        audioUrl={currentSectionData.audioUrl || undefined}
                        timestampsUrl={currentSectionData.timestampsUrl || undefined}
                        autoPlay={!hasAutoPlayedFirst}
                        onComplete={handleAudioComplete}
                        onPlayingChange={(isPlaying) => {
                          if (isPlaying) {
                            setActivePlayingSectionId(currentSection);
                            // Mark as played to prevent auto-play from triggering again for this section
                            setHasAutoPlayedFirst(true);
                          } else {
                            // Clear active section when paused
                            // Note: Audio completion is handled by onComplete callback
                            setActivePlayingSectionId(null);
                          }
                        }}
                        hideText={true}
                        onHighlightedWord={handleKeyTermsHighlightedWord}
                        highlightQuery={searchHighlight}
                      />
                    </div>
                  )}
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
                      autoPlay={!hasAutoPlayedFirst}
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
                {currentIndex < sections.length - 1 ? "Next" : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
