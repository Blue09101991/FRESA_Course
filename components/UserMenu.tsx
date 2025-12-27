"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "Admin" | "Developer" | "Editor" | "Student";
}

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

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
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // If auth fails (401, 404, 500, etc.), just clear the token and show login
        // Don't log errors for 401/404 as they're expected when not logged in
        if (response.status >= 500) {
          console.warn("Auth service error:", response.status);
        }
        // Clear invalid token
        document.cookie = "auth-token=; path=/; max-age=0";
        setUser(null);
      }
    } catch (err) {
      // Silently handle network errors - just show login/signup
      console.warn("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    setUser(null);
    setShowMenu(false);
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const isAdmin = ["Admin", "Developer", "Editor"].includes(user.role);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1f3a]/60 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all"
      >
        <div className="text-left hidden sm:block">
          <div className="text-white text-xs font-medium leading-tight">{user.name}</div>
          <div className="text-cyan-400 text-[10px] leading-tight">{user.role}</div>
        </div>
        <div className="text-left sm:hidden">
          <div className="text-white text-xs font-medium">{user.name.split(' ')[0]}</div>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${
            showMenu ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-[#1a1f3a] border border-cyan-500/30 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-cyan-500/20">
              <div className="text-white font-medium">{user.name}</div>
              <div className="text-gray-400 text-sm">{user.email}</div>
              <div className="text-cyan-400 text-xs mt-1">{user.role}</div>
            </div>

            <div className="py-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setShowMenu(false)}
                className="block px-4 py-2 text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

