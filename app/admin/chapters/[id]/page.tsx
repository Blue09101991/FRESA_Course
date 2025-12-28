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

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  quizType: string;
  order: number;
}

interface LearningObjective {
  id: string;
  text: string;
  order: number;
}

interface KeyTerm {
  id: string;
  term: string;
  order: number;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sections: Section[];
  learningObjectives?: LearningObjective[];
  keyTerms?: KeyTerm[];
  quizQuestions?: QuizQuestion[];
}

export default function ChapterEditPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [learningObjectives, setLearningObjectives] = useState<LearningObjective[]>([]);
  const [keyTerms, setKeyTerms] = useState<KeyTerm[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingObjective, setEditingObjective] = useState<string | null>(null);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [editingKeyTerm, setEditingKeyTerm] = useState<string | null>(null);
  const [showKeyTermForm, setShowKeyTermForm] = useState(false);
  const [editingChapterInfo, setEditingChapterInfo] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    title: "",
    description: "",
  });
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({
    sectionNumber: 1,
    title: "",
    text: "",
    type: "content",
    audioUrl: "",
    timestampsUrl: "",
    order: 0,
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingTimestamps, setUploadingTimestamps] = useState(false);

  const handleFileUpload = async (file: File, type: 'audio' | 'timestamps') => {
    try {
      if (type === 'audio') {
        setUploadingAudio(true);
      } else {
        setUploadingTimestamps(true);
      }

      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'audio') {
          setSectionForm({ ...sectionForm, audioUrl: data.url });
        } else {
          setSectionForm({ ...sectionForm, timestampsUrl: data.url });
        }
        alert(`File uploaded successfully! URL: ${data.url}`);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    } finally {
      if (type === 'audio') {
        setUploadingAudio(false);
      } else {
        setUploadingTimestamps(false);
      }
    }
  };

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
        setChapterForm({
          title: data.chapter.title || "",
          description: data.chapter.description || "",
        });
        setSections(data.chapter.sections || []);
        setLearningObjectives(data.chapter.learningObjectives || []);
        setKeyTerms(data.chapter.keyTerms || []);
      }
      
      // Fetch quiz questions for this chapter
      const questionsResponse = await fetch(`/api/admin/quiz-questions?chapterId=${chapterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuizQuestions(questionsData.questions || []);
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

  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: "",
    options: ["", ""], // Start with minimum 2 options
    correctAnswer: 0,
    explanation: { correct: "", incorrect: [] },
    quizType: "chapter",
    order: 0,
  });

  const handleSaveQuestion = async (questionId?: string) => {
    try {
      const token = getToken();
      const url = questionId
        ? `/api/admin/quiz-questions/${questionId}`
        : `/api/admin/quiz-questions`;
      const method = questionId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...questionForm,
          chapterId: chapterId === "new" ? null : chapterId,
        }),
      });

      if (response.ok) {
        await fetchChapter();
        setShowQuestionForm(false);
        setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  options: ["", ""], // Start with minimum 2 options
                  correctAnswer: 0,
                  explanation: { correct: "", incorrect: [] },
                  quizType: "chapter",
                  order: 0,
                });
      }
    } catch (err) {
      console.error("Error saving question:", err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/quiz-questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchChapter();
      }
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  const startEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question.id);
    setQuestionForm(question);
    setShowQuestionForm(true);
  };

  const [objectiveForm, setObjectiveForm] = useState<Partial<LearningObjective>>({
    text: "",
    order: 0,
  });

  const [keyTermForm, setKeyTermForm] = useState<Partial<KeyTerm>>({
    term: "",
    order: 0,
  });

  const handleSaveObjective = async (objectiveId?: string) => {
    try {
      const token = getToken();
      const url = objectiveId
        ? `/api/admin/objectives/${objectiveId}`
        : `/api/admin/objectives`;
      const method = objectiveId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...objectiveForm,
          chapterId: chapterId === "new" ? null : chapterId,
        }),
      });

      if (response.ok) {
        await fetchChapter();
        setShowObjectiveForm(false);
        setEditingObjective(null);
        setObjectiveForm({ text: "", order: 0 });
      }
    } catch (err) {
      console.error("Error saving objective:", err);
    }
  };

  const handleSaveKeyTerm = async (keyTermId?: string) => {
    try {
      const token = getToken();
      const url = keyTermId
        ? `/api/admin/key-terms/${keyTermId}`
        : `/api/admin/key-terms`;
      const method = keyTermId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...keyTermForm,
          chapterId: chapterId === "new" ? null : chapterId,
        }),
      });

      if (response.ok) {
        await fetchChapter();
        setShowKeyTermForm(false);
        setEditingKeyTerm(null);
        setKeyTermForm({ term: "", order: 0 });
      }
    } catch (err) {
      console.error("Error saving key term:", err);
    }
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
          {chapter && (
            <div className="flex gap-4 mt-4">
              <Link
                href={`/chapter-${chapter.number}`}
                target="_blank"
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all text-sm"
              >
                👁️ View Live Page
              </Link>
              <button
                onClick={async () => {
                  await fetchChapter();
                  alert("Content refreshed! Changes should be visible on the website now.");
                }}
                className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-all text-sm"
              >
                🔄 Refresh Content
              </button>
              <button
                onClick={() => setEditingChapterInfo(!editingChapterInfo)}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm"
              >
                {editingChapterInfo ? "✖️ Cancel Edit" : "✏️ Edit Chapter Info"}
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete Chapter ${chapter.number}: ${chapter.title}? This will also delete all sections, objectives, key terms, and quiz questions. This action cannot be undone!`)) {
                    try {
                      const token = getToken();
                      const response = await fetch(`/api/admin/chapters/${chapter.id}`, {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      
                      if (response.ok) {
                        alert("Chapter deleted successfully!");
                        router.push("/admin");
                      } else {
                        const error = await response.json();
                        alert(`Error: ${error.error || "Failed to delete chapter"}`);
                      }
                    } catch (err) {
                      console.error("Error deleting chapter:", err);
                      alert("Failed to delete chapter");
                    }
                  }
                }}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
              >
                🗑️ Delete Chapter
              </button>
            </div>
          )}
        </div>

        {/* Chapter Info Edit Form */}
        {chapter && editingChapterInfo && (
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Chapter Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Enter chapter title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Enter chapter description (optional)"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    try {
                      const token = getToken();
                      const response = await fetch(`/api/admin/chapters/${chapter.id}`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          number: chapter.number,
                          title: chapterForm.title,
                          description: chapterForm.description || null,
                        }),
                      });

                      if (response.ok) {
                        await fetchChapter();
                        setEditingChapterInfo(false);
                        alert("Chapter information updated successfully!");
                      } else {
                        const error = await response.json();
                        alert(`Error: ${error.error || "Failed to update chapter"}`);
                      }
                    } catch (err) {
                      console.error("Error updating chapter:", err);
                      alert("Failed to update chapter");
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setChapterForm({
                      title: chapter?.title || "",
                      description: chapter?.description || "",
                    });
                    setEditingChapterInfo(false);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Info Display (when not editing) */}
        {chapter && !editingChapterInfo && (
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Chapter Information</h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400 text-sm">Title:</span>
                    <p className="text-white text-lg font-semibold">{chapter.title}</p>
                  </div>
                  {chapter.description && (
                    <div>
                      <span className="text-gray-400 text-sm">Description:</span>
                      <p className="text-white">{chapter.description}</p>
                    </div>
                  )}
                  {!chapter.description && (
                    <p className="text-gray-500 text-sm italic">No description set</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sections List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Sections</h2>
            <button
              onClick={() => {
                setShowSectionForm(true);
                setEditingSection(null);
                // Calculate next section number based on existing sections
                const maxSectionNumber = sections.length > 0 
                  ? Math.max(...sections.map(s => s.sectionNumber || 0))
                  : 0;
                setSectionForm({
                  sectionNumber: maxSectionNumber + 1,
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
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No sections yet</p>
                <p className="text-xs mt-1">Add sections to display chapter content</p>
              </div>
            ) : (
              sections.map((section) => (
                <div
                  key={section.id}
                  className="p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {section.title}
                      </h3>
                      {section.text && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {section.text}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Type: {section.type}</span>
                        <span>Section #: {section.sectionNumber}</span>
                        <span>Order: {section.order}</span>
                        {section.audioUrl && <span>Audio: ✓</span>}
                        {section.timestampsUrl && <span>Timestamps: ✓</span>}
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
              ))
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-green-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Learning Objectives</h2>
            <button
              onClick={() => {
                setShowObjectiveForm(true);
                setEditingObjective(null);
                setObjectiveForm({ text: "", order: learningObjectives.length });
              }}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300"
            >
              + New Objective
            </button>
          </div>
          <div className="space-y-2">
            {learningObjectives.map((obj) => (
              <div key={obj.id} className="p-3 bg-[#0a0e27]/50 border border-green-500/20 rounded-lg flex justify-between items-center">
                <span className="text-white">{obj.text}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingObjective(obj.id);
                      setObjectiveForm(obj);
                      setShowObjectiveForm(true);
                    }}
                    className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this objective?")) {
                        const token = getToken();
                        await fetch(`/api/admin/objectives/${obj.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        await fetchChapter();
                      }
                    }}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Terms */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-yellow-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Key Terms</h2>
            <button
              onClick={() => {
                setShowKeyTermForm(true);
                setEditingKeyTerm(null);
                setKeyTermForm({ term: "", order: keyTerms.length });
              }}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
            >
              + New Key Term
            </button>
          </div>
          <div className="space-y-2">
            {keyTerms.map((term) => (
              <div key={term.id} className="p-3 bg-[#0a0e27]/50 border border-yellow-500/20 rounded-lg flex justify-between items-center">
                <span className="text-white">{term.term}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingKeyTerm(term.id);
                      setKeyTermForm(term);
                      setShowKeyTermForm(true);
                    }}
                    className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 hover:bg-yellow-500/30 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this key term?")) {
                        const token = getToken();
                        await fetch(`/api/admin/key-terms/${term.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        await fetchChapter();
                      }
                    }}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Questions List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Quiz Questions</h2>
            <button
              onClick={() => {
                setShowQuestionForm(true);
                setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  options: ["", ""], // Start with minimum 2 options
                  correctAnswer: 0,
                  explanation: { correct: "", incorrect: [] },
                  quizType: "chapter",
                  order: quizQuestions.length,
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
            >
              + New Question
            </button>
          </div>

          <div className="space-y-4">
            {quizQuestions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No quiz questions yet</p>
                <p className="text-xs mt-1">Add questions to test student knowledge</p>
              </div>
            ) : (
              quizQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 bg-[#0a0e27]/50 border border-purple-500/20 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {question.question}
                      </h3>
                      <div className="space-y-1 mb-2">
                        {question.options.map((option, idx) => (
                          <div
                            key={idx}
                            className={`text-sm ${
                              idx === question.correctAnswer
                                ? "text-green-400 font-semibold"
                                : "text-gray-400"
                            }`}
                          >
                            {idx === question.correctAnswer ? "✓ " : "  "}
                            {option}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Correct Answer: Option {question.correctAnswer + 1} | Order: {question.order}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEditQuestion(question)}
                        className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/30 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sectionForm.audioUrl || ""}
                      onChange={(e) =>
                        setSectionForm({ ...sectionForm, audioUrl: e.target.value })
                      }
                      className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                      placeholder="/audio/chapter1-section1.mp3"
                    />
                    <label className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {uploadingAudio ? "Uploading..." : "📁 Upload"}
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'audio');
                          }
                        }}
                        disabled={uploadingAudio}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload MP3 file or enter URL manually</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timestamps URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sectionForm.timestampsUrl || ""}
                      onChange={(e) =>
                        setSectionForm({
                          ...sectionForm,
                          timestampsUrl: e.target.value,
                        })
                      }
                      className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                      placeholder="/timestamps/chapter1-section1.timestamps.json"
                    />
                    <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {uploadingTimestamps ? "Uploading..." : "📁 Upload"}
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'timestamps');
                          }
                        }}
                        disabled={uploadingTimestamps}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload JSON file or enter URL manually</p>
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

        {/* Question Form Modal */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-purple-500/20 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingQuestion ? "Edit Question" : "New Question"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question
                  </label>
                  <textarea
                    value={questionForm.question || ""}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                    placeholder="Enter the question text..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Answer Options (select correct answer with radio button)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(questionForm.options || []), ""];
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all"
                    >
                      + Add Option
                    </button>
                  </div>
                  {(questionForm.options || []).map((option, idx) => (
                    <div key={idx} className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={questionForm.correctAnswer === idx}
                        onChange={() =>
                          setQuestionForm({ ...questionForm, correctAnswer: idx })
                        }
                        className="w-4 h-4 text-purple-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(questionForm.options || [])];
                          newOptions[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOptions });
                        }}
                        className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {(questionForm.options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...(questionForm.options || [])];
                            newOptions.splice(idx, 1);
                            // Adjust correctAnswer if needed
                            let newCorrectAnswer = questionForm.correctAnswer || 0;
                            if (newCorrectAnswer === idx) {
                              // If removing the correct answer, set to first option
                              newCorrectAnswer = 0;
                            } else if (newCorrectAnswer > idx) {
                              // If correct answer is after removed option, decrement
                              newCorrectAnswer = newCorrectAnswer - 1;
                            }
                            setQuestionForm({ 
                              ...questionForm, 
                              options: newOptions,
                              correctAnswer: newCorrectAnswer
                            });
                          }}
                          className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
                          title="Remove this option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {(questionForm.options || []).length < 2 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ At least 2 options are required
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correct Answer Explanation
                  </label>
                  <textarea
                    value={questionForm.explanation?.correct || ""}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: {
                          ...questionForm.explanation,
                          correct: e.target.value,
                          incorrect: questionForm.explanation?.incorrect || [],
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                    placeholder="Explanation for correct answer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incorrect Answer Explanations (one per line)
                  </label>
                  <textarea
                    value={(questionForm.explanation?.incorrect || []).join("\n")}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: {
                          ...questionForm.explanation,
                          correct: questionForm.explanation?.correct || "",
                          incorrect: e.target.value.split("\n").filter((line) => line.trim()),
                        },
                      })
                    }
                    rows={4}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                    placeholder="One explanation per line..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={questionForm.order || 0}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveQuestion(editingQuestion || undefined)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Learning Objective Form Modal */}
        {showObjectiveForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-green-500/20 p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingObjective ? "Edit Learning Objective" : "New Learning Objective"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Objective Text
                  </label>
                  <textarea
                    value={objectiveForm.text || ""}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, text: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                    placeholder="Enter learning objective..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={objectiveForm.order || 0}
                    onChange={(e) =>
                      setObjectiveForm({
                        ...objectiveForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveObjective(editingObjective || undefined)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowObjectiveForm(false);
                    setEditingObjective(null);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key Term Form Modal */}
        {showKeyTermForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-yellow-500/20 p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingKeyTerm ? "Edit Key Term" : "New Key Term"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Term
                  </label>
                  <input
                    type="text"
                    value={keyTermForm.term || ""}
                    onChange={(e) =>
                      setKeyTermForm({ ...keyTermForm, term: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-yellow-500/30 rounded-lg text-white"
                    placeholder="Enter key term..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={keyTermForm.order || 0}
                    onChange={(e) =>
                      setKeyTermForm({
                        ...keyTermForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-yellow-500/30 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveKeyTerm(editingKeyTerm || undefined)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowKeyTermForm(false);
                    setEditingKeyTerm(null);
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

