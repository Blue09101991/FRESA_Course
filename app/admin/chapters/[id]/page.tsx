"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface Section {
  id: string;
  sectionNumber: number;
  title: string;
  text: string;
  type: string;
  audioUrl: string | null;
  timestampsUrl: string | null;
  order: number;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sections: Section[];
}

export default function ChapterEditPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({
    sectionNumber: 1,
    title: "",
    text: "",
    type: "content",
    audioUrl: "",
    timestampsUrl: "",
    order: 0,
  });

  useEffect(() => {
    if (chapterId && chapterId !== "new") {
      fetchChapter();
    } else {
      setLoading(false);
    }
  }, [chapterId]);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const fetchChapter = async () => {
    try {
      const token = getToken();
      const response = await fetch(`/api/admin/chapters/${chapterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChapter(data.chapter);
        setSections(data.chapter.sections || []);
      }
    } catch (err) {
      console.error("Error fetching chapter:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionId?: string) => {
    try {
      const token = getToken();
      const url = sectionId
        ? `/api/admin/sections/${sectionId}`
        : `/api/admin/sections`;
      const method = sectionId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...sectionForm,
          chapterId: chapterId === "new" ? null : chapterId,
        }),
      });

      if (response.ok) {
        await fetchChapter();
        setShowSectionForm(false);
        setEditingSection(null);
        setSectionForm({
          sectionNumber: 1,
          title: "",
          text: "",
          type: "content",
          audioUrl: "",
          timestampsUrl: "",
          order: 0,
        });
      }
    } catch (err) {
      console.error("Error saving section:", err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchChapter();
      }
    } catch (err) {
      console.error("Error deleting section:", err);
    }
  };

  const startEditSection = (section: Section) => {
    setEditingSection(section.id);
    setSectionForm(section);
    setShowSectionForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
          >
            ← Back to Admin Panel
          </Link>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
            {chapter ? `Chapter ${chapter.number}: ${chapter.title}` : "New Chapter"}
          </h1>
        </div>

        {/* Sections List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Sections</h2>
            <button
              onClick={() => {
                setShowSectionForm(true);
                setEditingSection(null);
                setSectionForm({
                  sectionNumber: sections.length + 1,
                  title: "",
                  text: "",
                  type: "content",
                  audioUrl: "",
                  timestampsUrl: "",
                  order: sections.length,
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
            >
              + New Section
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {section.text}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Type: {section.type}</span>
                      <span>Order: {section.order}</span>
                      {section.audioUrl && <span>Audio: ✓</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEditSection(section)}
                      className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Form Modal */}
        {showSectionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-cyan-500/20 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingSection ? "Edit Section" : "New Section"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Section Number
                  </label>
                  <input
                    type="number"
                    value={sectionForm.sectionNumber || ""}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        sectionNumber: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={sectionForm.title || ""}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, title: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={sectionForm.type || "content"}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, type: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  >
                    <option value="objectives">Learning Objectives</option>
                    <option value="key-terms">Key Terms</option>
                    <option value="content">Content</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Text Content
                  </label>
                  <textarea
                    value={sectionForm.text || ""}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, text: e.target.value })
                    }
                    rows={8}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Audio URL
                  </label>
                  <input
                    type="text"
                    value={sectionForm.audioUrl || ""}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, audioUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                    placeholder="/audio/chapter1-section1.mp3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timestamps URL
                  </label>
                  <input
                    type="text"
                    value={sectionForm.timestampsUrl || ""}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        timestampsUrl: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                    placeholder="/timestamps/chapter1-section1.timestamps.json"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={sectionForm.order || 0}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveSection(editingSection || undefined)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSectionForm(false);
                    setEditingSection(null);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

