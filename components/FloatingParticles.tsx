"use client";

import { useState, useEffect } from "react";

interface Particle {
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

export default function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only generate particles on client side to avoid hydration mismatch
    setMounted(true);
    const generatedParticles: Particle[] = Array.from({ length: 20 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 3 + Math.random() * 2,
    }));
    setParticles(generatedParticles);
  }, []);

  if (!mounted) {
    // Return empty div during SSR to avoid hydration mismatch
    return <div className="absolute inset-0 overflow-hidden pointer-events-none" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-blue-400/40 rounded-full animate-float"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`,
          }}
        />
      ))}
    </div>
  );
}

