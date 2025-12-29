"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface IntroductionData {
  id?: string;
  text: string;
  audioUrl: string;
  timestampsUrl: string;
}

export default function IntroductionEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingTimestamps, setUploadingTimestamps] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [introData, setIntroData] = useState<IntroductionData>({
    text: "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.",
    audioUrl: "/audio/intro.mp3",
    timestampsUrl: "/timestamps/intro.timestamps.json",
  });

  useEffect(() => {
    fetchIntroduction();
  }, []);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const fetchIntroduction = async () => {
    try {
      const token = getToken();
      // For now, we'll use a special chapter number 0 for introduction
      // Or we can create a dedicated API endpoint
      const response = await fetch("/api/admin/introduction", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.introduction) {
          setIntroData(data.introduction);
        }
      }
    } catch (err) {
      console.error("Error fetching introduction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async (text: string) => {
    if (!text || text.trim().length === 0) {
      alert("Please enter text content first");
      return;
    }

    try {
      setGeneratingAudio(true);
      const token = getToken();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, type: 'both', context: 'introduction' }), // Use man's voice for introduction
      });

      if (response.ok) {
        const data = await response.json();
        const updatedData = {
          ...introData,
          audioUrl: data.audioUrl,
          timestampsUrl: data.timestampsUrl,
        };
        setIntroData(updatedData);
        
        // Automatically save the introduction with generated URLs
        try {
          const token = getToken();
          const saveResponse = await fetch("/api/admin/introduction", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify(updatedData),
          });

          if (saveResponse.ok) {
            alert(`✅ Audio and timestamps generated and saved successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nThe introduction page has been updated with these files.`);
          } else {
            const saveError = await saveResponse.json();
            alert(`⚠️ Audio and timestamps generated, but failed to save:\n${saveError.error || 'Unknown error'}\n\nYou can manually save by clicking "Save Introduction".`);
          }
        } catch (saveErr) {
          console.error('Error auto-saving:', saveErr);
          alert(`⚠️ Audio and timestamps generated, but failed to save automatically.\n\nYou can manually save by clicking "Save Introduction".`);
        }
      } else {
        const error = await response.json();
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating audio:', err);
      alert('Failed to generate audio');
    } finally {
      setGeneratingAudio(false);
    }
  };

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
          setIntroData({ ...introData, audioUrl: data.url });
        } else {
          setIntroData({ ...introData, timestampsUrl: data.url });
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch("/api/admin/introduction", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(introData),
      });

      if (response.ok) {
        alert("Introduction page saved successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save"}`);
      }
    } catch (err) {
      console.error("Error saving introduction:", err);
      alert("Failed to save introduction");
    } finally {
      setSaving(false);
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
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-2">
            Edit Introduction Page
          </h1>
        </div>

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-6">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Introduction Text
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateAudio(introData.text)}
                  disabled={generatingAudio || !introData.text || introData.text.trim().length === 0}
                  className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
                </button>
              </div>
              <textarea
                value={introData.text}
                onChange={(e) =>
                  setIntroData({ ...introData, text: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                placeholder="Enter introduction text..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter your text and click "Generate Audio & Timestamps" to automatically create audio and timestamp files using ElevenLabs AI
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audio URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={introData.audioUrl}
                  onChange={(e) =>
                    setIntroData({ ...introData, audioUrl: e.target.value })
                  }
                  className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  placeholder="/audio/intro.mp3"
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
                  value={introData.timestampsUrl}
                  onChange={(e) =>
                    setIntroData({ ...introData, timestampsUrl: e.target.value })
                  }
                  className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                  placeholder="/timestamps/intro.timestamps.json"
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

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Introduction"}
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

