"use client";

import { useState, useEffect } from "react";

interface Star {
  left: number;
  top: number;
  animationDelay: number;
  opacity: number;
}

export default function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only generate stars on client side to avoid hydration mismatch
    setMounted(true);
    const generatedStars: Star[] = Array.from({ length: 50 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 2,
      opacity: Math.random() * 0.5 + 0.3,
    }));
    setStars(generatedStars);
  }, []);

  if (!mounted) {
    // Return empty div during SSR to avoid hydration mismatch
    return <div className="absolute inset-0 overflow-hidden pointer-events-none" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-glow"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.animationDelay}s`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}

