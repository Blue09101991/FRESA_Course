"use client";

import { useState, useEffect } from "react";
import MrListings from "./MrListings";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
  showCharacter?: boolean;
}

export default function Quiz({ questions, onComplete, showCharacter = true }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionScore, setCurrentQuestionScore] = useState(0);
  const [characterAnimation, setCharacterAnimation] = useState<"idle" | "thumbs-up" | "thumbs-down" | "congratulations">("idle");

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

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

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Character */}
      {showCharacter && (
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {currentQuestionIndex + 1}/{questions.length}
            </div>
            <MrListings size="medium" animation={characterAnimation} />
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl mb-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-white">
          {currentQuestion.question}
        </h2>

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
                key={index}
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
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`p-4 rounded-lg mb-4 animate-slide-up ${
            isCorrect ? "bg-green-500/20 border border-green-500/50" : "bg-red-500/20 border border-red-500/50"
          }`}>
            <p className={`font-semibold mb-2 ${isCorrect ? "text-green-300" : "text-red-300"}`}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="text-white text-sm md:text-base">
              {isCorrect
                ? currentQuestion.explanation.correct
                : currentQuestion.explanation.incorrect[selectedAnswer!] || currentQuestion.explanation.correct}
            </p>
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

