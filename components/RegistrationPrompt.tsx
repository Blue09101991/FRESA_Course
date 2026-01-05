"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MrListings from "./MrListings";

interface RegistrationPromptProps {
  score: number;
  total: number;
  onRegister: () => void;
  onLogin: () => void;
  onSkip: () => void;
}

export default function RegistrationPrompt({
  score,
  total,
  onRegister,
  onLogin,
  onSkip,
}: RegistrationPromptProps) {
  const router = useRouter();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-8 md:p-12 shadow-2xl max-w-2xl w-full mx-4 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Mr Listings Character */}
        <div className="flex justify-center mb-6">
          <MrListings size="medium" />
        </div>

        {/* Congratulations Message */}
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-blue-300">
            Congratulations! 🎉
          </h2>
          <p className="text-xl text-white mb-2">
            You&apos;ve completed Chapter 1!
          </p>
          <p className="text-lg text-blue-300 mb-4">
            Score: {score} out of {total}
          </p>
        </div>

        {/* Registration Prompt */}
        <div className="bg-[#0a1a2e] border border-blue-500/20 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">
            Register to Save Your Progress
          </h3>
          <p className="text-gray-300 mb-4">
            Great job completing Chapter 1! To continue with the rest of the course and save your progress, please register for a free account.
          </p>
          <ul className="text-gray-300 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Save your progress automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Access all chapters and content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Track your learning journey</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRegister}
            className="flex-1 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            Register Now
          </button>
          <button
            onClick={onLogin}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Already have an account? Login
          </button>
        </div>

        {/* Skip Option */}
        <div className="mt-4 text-center">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
          >
            Continue without registering
          </button>
        </div>
      </div>
    </div>
  );
}

