"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "Admin" | "Developer" | "Editor" | "Student";
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sections: any[];
  _count: {
    sections: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
    fetchChapters();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        console.error("No auth token found");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Auth check failed:", response.status, errorData);
        router.push("/login");
        return;
      }

      const data = await response.json();
      setUser(data.user);

      if (!["Admin", "Developer", "Editor"].includes(data.user.role)) {
        console.error("User role not authorized:", data.user.role);
        router.push("/");
        return;
      }
    } catch (err) {
      console.error("Auth check error:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/chapters", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setChapters(data.chapters);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load chapters");
      }
    } catch (err) {
      console.error("Error fetching chapters:", err);
      setError("Failed to load chapters");
    }
  };

  const handleLogout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading Admin Panel...</div>
          <div className="text-gray-400 text-sm">Please wait while we verify your access</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Access Denied</div>
          <div className="text-gray-400 text-sm mb-4">You need to be logged in as an admin to access this page.</div>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-400">
              Welcome, {user?.name || user?.email} ({user?.role})
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-[#1a1f3a]/80 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Chapters List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Chapters</h2>
            <Link
              href="/admin/chapters/new"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
            >
              + New Chapter
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {chapters.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">No chapters yet</p>
                <p className="text-sm">Create your first chapter to get started</p>
              </div>
            ) : (
              chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/admin/chapters/${chapter.id}`}
                  className="block p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg hover:border-cyan-500/50 hover:bg-[#0a0e27]/70 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        Chapter {chapter.number}: {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className="text-gray-400 text-sm">{chapter.description}</p>
                      )}
                      <p className="text-cyan-400 text-sm mt-2">
                        {chapter._count.sections} section{chapter._count.sections !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-cyan-400">→</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

