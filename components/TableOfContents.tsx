"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface MenuItem {
  id: string;
  title: string;
  path: string;
  subsections?: string[];
}

interface TableOfContentsProps {
  items: MenuItem[];
  currentPath?: string;
}

export default function TableOfContents({ items, currentPath }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-4 z-50 bg-[#1e3a5f] border border-blue-500/30 rounded-lg p-3 shadow-lg hover:bg-[#2d4a6f] transition-all duration-200 md:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#0a1a2e]/95 backdrop-blur-md border-r border-blue-500/30 z-40 overflow-y-auto shadow-xl">
        <div className="p-4">
          <h2 className="text-lg font-bold text-white mb-4 px-2">Course Navigation</h2>
          <nav className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  pathname === item.path || currentPath === item.path
                    ? "bg-gradient-to-r from-blue-500/40 to-cyan-500/30 text-blue-100 font-semibold border-l-4 border-cyan-400 shadow-md"
                    : "text-gray-300 hover:bg-blue-500/15 hover:text-white hover:translate-x-1"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-relaxed">{item.title}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#0a1a2e] border-r border-blue-500/30 z-50 overflow-y-auto md:hidden animate-slide-up">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Course Navigation</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-300 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      pathname === item.path || currentPath === item.path
                        ? "bg-blue-500/30 text-blue-300 font-semibold border-l-4 border-blue-500"
                        : "text-gray-300 hover:bg-blue-500/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.title}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

