"use client";

import { useState } from "react";

interface RegistrationModalProps {
  onClose: () => void;
  onRegister: (email: string) => void;
}

export default function RegistrationModal({
  onClose,
  onRegister,
}: RegistrationModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    onRegister(email);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-scale-in">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Register to Save Your Progress
        </h2>
        <p className="text-gray-300 mb-6 text-center">
          Enter your email to save your progress and continue where you left off.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-[#0a1a2e] border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-all duration-200 font-semibold"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

