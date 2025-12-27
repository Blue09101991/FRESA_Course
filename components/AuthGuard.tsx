"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StarsBackground from "./StarsBackground";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        // Store the intended destination
        const currentPath = window.location.pathname;
        if (currentPath !== "/" && currentPath !== "/login" && currentPath !== "/signup") {
          sessionStorage.setItem("redirectAfterLogin", currentPath);
        }
        router.push(redirectTo);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        router.push(redirectTo);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setIsAuthenticated(false);
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center">
        <StarsBackground />
        <div className="relative z-10 text-center">
          <div className="text-white text-xl mb-4">Checking authentication...</div>
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

