"use client";

import { useState, useEffect, useRef } from "react";
import MrListings from "./MrListings";
import AudioPlayer from "./AudioPlayer";
import { highlightText } from "@/lib/highlightText";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  explanationAudioUrl?: string | null;
  explanationTimestampsUrl?: string | null;
  correctExplanationAudioUrl?: string | null;
  correctExplanationTimestampsUrl?: string | null;
  incorrectExplanationAudioUrls?: string[] | null;
  incorrectExplanationTimestampsUrls?: string[] | null;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
  showCharacter?: boolean;
  searchHighlight?: string; // Search query to highlight in questions and options
}

export default function Quiz({ questions, onComplete, showCharacter = true, searchHighlight }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionScore, setCurrentQuestionScore] = useState(0);
  const [characterAnimation, setCharacterAnimation] = useState<"idle" | "thumbs-up" | "thumbs-down" | "congratulations">("idle");
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [hasAutoPlayedQuestion, setHasAutoPlayedQuestion] = useState(false);
  const [hasAutoPlayedExplanation, setHasAutoPlayedExplanation] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const explanationRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Build question text with options for AudioPlayer (without "Option 1:", "Option 2:", etc.)
  const questionText = currentQuestion 
    ? `${currentQuestion.question}. ${currentQuestion.options.join(". ")}`
    : "";

  // Normalize word for matching (remove punctuation, lowercase)
  const normalizeWord = (word: string) => {
    return word.toLowerCase().replace(/[^\w]/g, '');
  };

  // Handle word highlighting from AudioPlayer - highlight only the current word at the correct position
  const handleHighlightedWord = (word: string, wordIndex: number) => {
    // First, remove all highlights
    removeHighlights(questionRef.current);
    optionsRefs.current.forEach((ref) => {
      if (ref) {
        removeHighlights(ref);
      }
    });

    // Get the full audio text and split into words (same way AudioPlayer does)
    const audioWords = questionText.split(/\s+/).filter(w => w.length > 0);
    
    // Calculate which part (question or option) this word belongs to
    const questionWords = currentQuestion.question.split(/\s+/).filter(w => w.length > 0);
    const questionWordCount = questionWords.length;
    
    if (wordIndex < questionWordCount) {
      // Word is in the question
      highlightWordAtPosition(questionRef.current, wordIndex);
    } else {
      // Word is in one of the options
      let cumulativeWordCount = questionWordCount + 1; // +1 for the period/separator
      for (let i = 0; i < currentQuestion.options.length; i++) {
        const optionText = currentQuestion.options[i];
        const optionWords = optionText.split(/\s+/).filter(w => w.length > 0);
        const optionWordCount = optionWords.length;
        
        if (wordIndex >= cumulativeWordCount && wordIndex < cumulativeWordCount + optionWordCount) {
          const positionInOption = wordIndex - cumulativeWordCount;
          highlightWordAtPosition(optionsRefs.current[i], positionInOption);
          break;
        }
        
        cumulativeWordCount += optionWordCount + 1; // +1 for separator
      }
    }
  };

  // Highlight a specific word at a specific position in an element
  const highlightWordAtPosition = (element: HTMLElement | null, targetPosition: number) => {
    if (!element || targetPosition < 0) return;

    // Remove previous highlights
    removeHighlights(element);

    // Get the full text and split it the same way we count words
    const fullText = element.textContent || '';
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    
    if (targetPosition >= words.length) return;

    // Now highlight the word at the specific position
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
      if (highlighted) return;
      
      const text = textNode.textContent || '';
      const parts = text.split(/(\s+)/);
      
      let newHTML = '';
      parts.forEach((part) => {
        if (part.trim()) {
          if (currentWordPosition === targetPosition && !highlighted) {
            newHTML += `<span data-audio-highlight style="background: linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%); background-size: 100% 85%; background-position: center; background-repeat: no-repeat; color: #fef08a; border-radius: 3px; text-shadow: 0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5); transition: background 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;">${part}</span>`;
            highlighted = true;
          } else {
            newHTML += part;
          }
          currentWordPosition++;
        } else {
          newHTML += part;
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

  // Reset highlights and refs when question changes
  useEffect(() => {
    setHighlightedWord(null);
    setHasAutoPlayedQuestion(false);
    setHasAutoPlayedExplanation(false);
    // Clear options refs array - will be repopulated when options render
    optionsRefs.current = new Array(currentQuestion?.options.length || 0).fill(null);
    // Remove highlights from previous question
    removeHighlights(questionRef.current);
    const explanationEl = document.querySelector('[data-explanation-text]') as HTMLElement;
    removeHighlights(explanationEl);
  }, [currentQuestionIndex, currentQuestion]);

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return; // Prevent changing answer after submission
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowExplanation(true);
    setCurrentQuestionScore(correct ? 1 : 0);
    setHasAutoPlayedExplanation(false); // Reset to allow auto-play of explanation

    if (correct) {
      setScore(prevScore => prevScore + 1);
      setCharacterAnimation("thumbs-up");
    } else {
      setCharacterAnimation("thumbs-down");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Show congratulations
      setCharacterAnimation("congratulations");
      setTimeout(() => {
        // Calculate final score including current question
        const finalScore = score + currentQuestionScore;
        onComplete(finalScore, questions.length);
      }, 2000);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsCorrect(false);
      setCurrentQuestionScore(0);
      setCharacterAnimation("idle");
    }
  };

  // Get explanation audio URL and text
  const getExplanationAudioUrl = () => {
    if (isCorrect) {
      return currentQuestion?.correctExplanationAudioUrl || currentQuestion?.explanationAudioUrl || null;
    } else {
      const incorrectAudioUrls = currentQuestion?.incorrectExplanationAudioUrls;
      if (incorrectAudioUrls && Array.isArray(incorrectAudioUrls) && incorrectAudioUrls.length > selectedAnswer!) {
        return incorrectAudioUrls[selectedAnswer!];
      }
      return currentQuestion?.explanationAudioUrl || null;
    }
  };

  const getExplanationText = () => {
    if (isCorrect) {
      return currentQuestion.explanation.correct;
    } else {
      return currentQuestion.explanation.incorrect[selectedAnswer!] || currentQuestion.explanation.correct;
    }
  };

  const getExplanationTimestampsUrl = () => {
    if (isCorrect) {
      return currentQuestion?.correctExplanationTimestampsUrl || currentQuestion?.explanationTimestampsUrl || null;
    } else {
      const incorrectTimestampsUrls = currentQuestion?.incorrectExplanationTimestampsUrls;
      if (incorrectTimestampsUrls && Array.isArray(incorrectTimestampsUrls) && incorrectTimestampsUrls.length > selectedAnswer!) {
        return incorrectTimestampsUrls[selectedAnswer!];
      }
      return currentQuestion?.explanationTimestampsUrl || null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress Indicator - Modern Design */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl px-4 py-2 backdrop-blur-sm">
              <span className="text-blue-300 text-sm font-medium">Question</span>
              <span className="text-white text-lg font-bold ml-2">
                {currentQuestionIndex + 1} <span className="text-blue-400">/</span> {questions.length}
              </span>
            </div>
          </div>
          <div className="flex-1 mx-4">
            <div className="h-2 bg-[#0a1a2e] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-blue-300 text-sm font-medium">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Character */}
      {showCharacter && (
        <div className="flex justify-center mb-6">
          <MrListings size="medium" animation={characterAnimation} />
        </div>
      )}

      {/* Question Card */}
      <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl mb-6">
        {/* Question Text - Clear and Prominent */}
        <div className="mb-6" ref={questionRef}>
          <h2 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
            {searchHighlight ? highlightText(currentQuestion.question, searchHighlight) : currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            let optionClass = "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 cursor-pointer ";
            
            if (showExplanation) {
              if (index === currentQuestion.correctAnswer) {
                optionClass += "bg-green-500/20 border-green-500 text-green-300 ";
              } else if (index === selectedAnswer && !isCorrect) {
                optionClass += "bg-red-500/20 border-red-500 text-red-300 ";
              } else {
                optionClass += "bg-[#0a1a2e] border-blue-500/30 text-gray-300 ";
              }
            } else {
              optionClass += selectedAnswer === index
                ? "bg-blue-500/30 border-blue-500 text-white "
                : "bg-[#0a1a2e] border-blue-500/30 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 ";
            }

            return (
              <button
                key={`option-${currentQuestionIndex}-${index}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={optionClass}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    showExplanation && index === currentQuestion.correctAnswer
                      ? "bg-green-500 border-green-500"
                      : showExplanation && index === selectedAnswer && !isCorrect
                      ? "bg-red-500 border-red-500"
                      : selectedAnswer === index
                      ? "bg-blue-500 border-blue-500"
                      : "border-blue-500/50"
                  }`}>
                    {showExplanation && index === currentQuestion.correctAnswer && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {showExplanation && index === selectedAnswer && !isCorrect && index !== currentQuestion.correctAnswer && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    {!showExplanation && selectedAnswer === index && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                  <span 
                    className="flex-1 text-base" 
                    ref={(el) => { 
                      if (el) {
                        optionsRefs.current[index] = el;
                      }
                    }}
                  >
                    {searchHighlight ? highlightText(option, searchHighlight) : option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Question Audio Player - Controls Only at Bottom */}
        {currentQuestion?.audioUrl && !showExplanation && (
          <div className="mb-6 pt-4 border-t border-blue-500/20">
            <AudioPlayer
              key={`question-audio-${currentQuestionIndex}`}
              text={questionText}
              audioUrl={currentQuestion.audioUrl}
              timestampsUrl={currentQuestion.timestampsUrl || undefined}
              autoPlay={!hasAutoPlayedQuestion}
              hideText={true}
              onHighlightedWord={handleHighlightedWord}
              onPlayingChange={(isPlaying) => {
                if (isPlaying) {
                  setHasAutoPlayedQuestion(true);
                }
              }}
            />
          </div>
        )}

        {/* Explanation */}
        {showExplanation && (
          <div className={`p-5 rounded-lg mb-6 animate-slide-up ${
            isCorrect ? "bg-green-500/20 border-2 border-green-500/50" : "bg-red-500/20 border-2 border-red-500/50"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              {isCorrect ? (
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`font-bold text-lg ${isCorrect ? "text-green-300" : "text-red-300"}`}>
                {isCorrect ? "Correct Answer!" : "Incorrect Answer"}
              </p>
            </div>
            
            {/* Explanation Text with Highlighting Support */}
            <div className="mb-4" data-explanation-text ref={explanationRef}>
              <p className="text-white text-base md:text-lg leading-relaxed">
                {searchHighlight ? highlightText(getExplanationText(), searchHighlight) : getExplanationText()}
              </p>
            </div>
            
            {/* Explanation Audio Player */}
            {getExplanationAudioUrl() && (
              <div className="pt-4 border-t border-white/10">
                <AudioPlayer
                  key={`explanation-audio-${currentQuestionIndex}-${isCorrect ? 'correct' : 'incorrect'}-${selectedAnswer}`}
                  text={getExplanationText()}
                  audioUrl={getExplanationAudioUrl() || undefined}
                  timestampsUrl={getExplanationTimestampsUrl() || undefined}
                  autoPlay={!hasAutoPlayedExplanation}
                  hideText={true}
                  onHighlightedWord={(word, wordIndex) => {
                    // Highlight only the current word at the correct position in explanation text
                    if (explanationRef.current) {
                      highlightWordAtPosition(explanationRef.current, wordIndex);
                    }
                  }}
                  onPlayingChange={(isPlaying) => {
                    if (isPlaying) {
                      setHasAutoPlayedExplanation(true);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {!showExplanation ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {isLastQuestion ? "View Results" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

