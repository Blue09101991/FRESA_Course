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
  chapterId?: string | null;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  questionAudioUrl?: string | null;
  questionTimestampsUrl?: string | null;
  optionAudioUrls?: string[] | null;
  optionTimestampsUrls?: string[] | null;
  explanationAudioUrl?: string | null;
  explanationTimestampsUrl?: string | null;
  correctExplanationAudioUrl?: string | null;
  correctExplanationTimestampsUrl?: string | null;
  incorrectExplanationAudioUrls?: string[] | null;
  incorrectExplanationTimestampsUrls?: string[] | null;
  quizType: string;
  order: number;
}

interface LearningObjective {
  id: string;
  text: string;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  order: number;
}

interface KeyTerm {
  id: string;
  term: string;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
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
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingObjectivesAudio, setGeneratingObjectivesAudio] = useState(false);
  const [generatingKeyTermsAudio, setGeneratingKeyTermsAudio] = useState(false);

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
        body: JSON.stringify({ text, type: 'both', context: 'section' }), // Use man's voice for sections
      });

      if (response.ok) {
        const data = await response.json();
        const updatedForm = {
          ...sectionForm,
          audioUrl: data.audioUrl,
          timestampsUrl: data.timestampsUrl,
        };
        setSectionForm(updatedForm);
        
        // Automatically save the section with generated URLs if we're editing an existing section
        if (editingSection) {
          try {
            const token = getToken();
            const saveResponse = await fetch(`/api/admin/sections/${editingSection}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...updatedForm,
                chapterId: chapterId === "new" ? null : chapterId,
              }),
            });

            if (saveResponse.ok) {
              await fetchChapter();
              alert(`✅ Audio and timestamps generated and saved successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nThe section has been updated with these files.`);
            } else {
              const saveError = await saveResponse.json();
              alert(`⚠️ Audio and timestamps generated, but failed to save:\n${saveError.error || 'Unknown error'}\n\nYou can manually save by clicking "Save Section".`);
            }
          } catch (saveErr) {
            console.error('Error auto-saving:', saveErr);
            alert(`⚠️ Audio and timestamps generated, but failed to save automatically.\n\nYou can manually save by clicking "Save Section".`);
          }
        } else {
          // New section - just show success message
          alert(`✅ Audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}\n\nClick "Save Section" to save the section with these files.`);
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

  const [generatingQuestionAudio, setGeneratingQuestionAudio] = useState(false);
  const [generatingQuizAudio, setGeneratingQuizAudio] = useState(false);
  const [quizGenerationProgress, setQuizGenerationProgress] = useState<{
    generatingQuestion: boolean;
    generatingOptions: number[]; // Array of option indices being generated
    generatingCorrectExplanation: boolean;
    generatingIncorrectExplanations: number[]; // Array of incorrect explanation indices being generated
    completed: {
      question: boolean;
      options: boolean[];
      correctExplanation: boolean;
      incorrectExplanations: boolean[];
    };
  }>({
    generatingQuestion: false,
    generatingOptions: [],
    generatingCorrectExplanation: false,
    generatingIncorrectExplanations: [],
    completed: {
      question: false,
      options: [],
      correctExplanation: false,
      incorrectExplanations: [],
    },
  });
  const [generatingCorrectExplanationAudio, setGeneratingCorrectExplanationAudio] = useState(false);
  const [generatingIncorrectExplanationAudio, setGeneratingIncorrectExplanationAudio] = useState<number | null>(null);
  const [generatingAllAudio, setGeneratingAllAudio] = useState(false);
  const [generatingAllChapterAudio, setGeneratingAllChapterAudio] = useState(false);

  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: "",
    options: ["", ""], // Start with minimum 2 options
    correctAnswer: 0,
    explanation: { correct: "", incorrect: [] },
    quizType: "chapter",
    order: 0,
  });

  const handleGenerateQuestionAudio = async () => {
    if (!questionForm.question || questionForm.question.trim().length === 0) {
      alert("Please enter a question first");
      return;
    }

    try {
      setGeneratingQuestionAudio(true);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingQuestion: true,
      }));
      
      const token = getToken();
      
      // Generate audio for question only
      const questionText = questionForm.question.trim();
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          text: questionText, 
          type: 'both',
          context: 'quiz' // Use woman's voice for quiz
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionForm({
          ...questionForm,
          questionAudioUrl: data.audioUrl,
          questionTimestampsUrl: data.timestampsUrl,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
          completed: { ...prev.completed, question: true },
        }));
        alert(`✅ Question audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating question audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingQuestion: false,
      }));
      alert('Failed to generate question audio');
    } finally {
      setGeneratingQuestionAudio(false);
    }
  };

  const handleGenerateQuizAudio = async () => {
    if (!questionForm.question || questionForm.question.trim().length === 0) {
      alert("Please enter a question first");
      return;
    }
    if (!questionForm.options || questionForm.options.length < 2) {
      alert("Please enter at least 2 options");
      return;
    }

    try {
      setGeneratingQuizAudio(true);
      setQuizGenerationProgress({
        generatingQuestion: true,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: new Array(questionForm.options.length).fill(false),
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
      
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Generate audio for question only
      const questionText = questionForm.question.trim();
      const questionResponse = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          text: questionText, 
          type: 'both',
          context: 'quiz' // Use woman's voice for quiz
        }),
      });

      let questionAudioUrl: string | null = null;
      let questionTimestampsUrl: string | null = null;

      if (questionResponse.ok) {
        const questionData = await questionResponse.json();
        questionAudioUrl = questionData.audioUrl;
        questionTimestampsUrl = questionData.timestampsUrl;
        results.push(`✅ Question: ${questionData.audioUrl}`);
        successCount++;
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
          completed: { ...prev.completed, question: true },
        }));
      } else {
        const error = await questionResponse.json();
        results.push(`❌ Question: ${error.error || 'Unknown error'}`);
        failCount++;
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
      }

      // Generate audio for each option separately
      const optionAudioUrls: string[] = [];
      const optionTimestampsUrls: string[] = [];
      
      for (let optIdx = 0; optIdx < questionForm.options.length; optIdx++) {
        const optionText = questionForm.options[optIdx]?.trim();
        if (!optionText) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this option is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingOptions: [...prev.generatingOptions, optIdx],
        }));

        try {
          const optionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: optionText, 
              type: 'both',
              context: 'quiz' // Use woman's voice for quiz
            }),
          });

          if (optionResponse.ok) {
            const optionData = await optionResponse.json();
            optionAudioUrls.push(optionData.audioUrl);
            optionTimestampsUrls.push(optionData.timestampsUrl);
            results.push(`✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
            successCount++;
          } else {
            const error = await optionResponse.json();
            optionAudioUrls.push("");
            optionTimestampsUrls.push("");
            results.push(`❌ Option ${optIdx + 1}: ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          results.push(`❌ Option ${optIdx + 1}: ${err.message || err}`);
          failCount++;
        } finally {
          // Update progress to show this option is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingOptions: prev.generatingOptions.filter(idx => idx !== optIdx),
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
        }
      }

      setQuestionForm({
        ...questionForm,
        questionAudioUrl: questionAudioUrl || undefined,
        questionTimestampsUrl: questionTimestampsUrl || undefined,
        optionAudioUrls: optionAudioUrls,
        optionTimestampsUrls: optionTimestampsUrls,
      });
      
      alert(`✅ Quiz audio generation complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating quiz audio:', err);
      alert('Failed to generate quiz audio');
    } finally {
      setGeneratingQuizAudio(false);
      setQuizGenerationProgress({
        generatingQuestion: false,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: [],
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
    }
  };

  const handleGenerateCorrectExplanationAudio = async () => {
    if (!questionForm.explanation?.correct?.trim()) {
      alert("Please enter correct explanation first");
      return;
    }

    try {
      setGeneratingCorrectExplanationAudio(true);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: true,
      }));
      
      const token = getToken();
      
      // Use only the explanation text, no title
      const explanationText = questionForm.explanation.correct.trim();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          text: explanationText, 
          type: 'both',
          context: 'quiz' // Use woman's voice for quiz
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionForm({
          ...questionForm,
          correctExplanationAudioUrl: data.audioUrl,
          correctExplanationTimestampsUrl: data.timestampsUrl,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
          completed: { ...prev.completed, correctExplanation: true },
        }));
        alert(`✅ Correct explanation audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating correct explanation audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: false,
      }));
      alert('Failed to generate correct explanation audio');
    } finally {
      setGeneratingCorrectExplanationAudio(false);
    }
  };

  const handleGenerateIncorrectExplanationAudio = async (index: number) => {
    if (!questionForm.explanation?.incorrect || !questionForm.explanation.incorrect[index]?.trim()) {
      alert("Please enter incorrect explanation for this option first");
      return;
    }

    try {
      setGeneratingIncorrectExplanationAudio(index);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingIncorrectExplanations: [...prev.generatingIncorrectExplanations, index],
      }));
      
      const token = getToken();
      
      // Use only the explanation text, no title
      const explanationText = questionForm.explanation.incorrect[index].trim();
      
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          text: explanationText, 
          type: 'both',
          context: 'quiz' // Use woman's voice for quiz
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const currentIncorrectAudioUrls = (questionForm.incorrectExplanationAudioUrls || []) as string[];
        const currentIncorrectTimestampsUrls = (questionForm.incorrectExplanationTimestampsUrls || []) as string[];
        
        // Ensure arrays are long enough
        while (currentIncorrectAudioUrls.length <= index) {
          currentIncorrectAudioUrls.push("");
        }
        while (currentIncorrectTimestampsUrls.length <= index) {
          currentIncorrectTimestampsUrls.push("");
        }
        
        currentIncorrectAudioUrls[index] = data.audioUrl;
        currentIncorrectTimestampsUrls[index] = data.timestampsUrl;
        
        setQuestionForm({
          ...questionForm,
          incorrectExplanationAudioUrls: currentIncorrectAudioUrls,
          incorrectExplanationTimestampsUrls: currentIncorrectTimestampsUrls,
        });
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
          completed: {
            ...prev.completed,
            incorrectExplanations: prev.completed.incorrectExplanations.map((done, idx) => idx === index ? true : done),
          },
        }));
        alert(`✅ Incorrect explanation audio and timestamps generated successfully for option ${index + 1}!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
      } else {
        const error = await response.json();
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
        }));
        alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating incorrect explanation audio:', err);
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(idx => idx !== index),
      }));
      alert('Failed to generate incorrect explanation audio');
    } finally {
      setGeneratingIncorrectExplanationAudio(null);
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!questionForm.question || !questionForm.question.trim()) {
      alert("Please enter a question first");
      return;
    }
    if (!questionForm.options || questionForm.options.length < 2) {
      alert("Please enter at least 2 options");
      return;
    }
    if (!questionForm.explanation?.correct?.trim()) {
      alert("Please enter correct explanation first");
      return;
    }
    if (!questionForm.explanation?.incorrect || questionForm.explanation.incorrect.length === 0) {
      alert("Please enter at least one incorrect explanation");
      return;
    }

    try {
      setGeneratingAllAudio(true);
      setQuizGenerationProgress({
        generatingQuestion: true,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: new Array(questionForm.options.length).fill(false),
          correctExplanation: false,
          incorrectExplanations: new Array(questionForm.explanation?.incorrect?.length || 0).fill(false),
        },
      });
      
      const token = getToken();
      const results: string[] = [];

      // 1. Generate separate audio for question and each option
      const questionText = questionForm.question.trim();
      
      // Generate audio for question only
      try {
        const questionResponse = await fetch('/api/admin/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            text: questionText, 
            type: 'both',
            context: 'quiz' // Use woman's voice for quiz
          }),
        });

        if (questionResponse.ok) {
          const questionData = await questionResponse.json();
          results.push(`✅ Question: ${questionData.audioUrl}`);
          setQuestionForm(prev => ({
            ...prev,
            questionAudioUrl: questionData.audioUrl,
            questionTimestampsUrl: questionData.timestampsUrl,
          }));
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingQuestion: false,
            completed: { ...prev.completed, question: true },
          }));
        } else {
          const error = await questionResponse.json();
          results.push(`❌ Question failed: ${error.error || 'Unknown error'}`);
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingQuestion: false,
          }));
        }
      } catch (err) {
        results.push(`❌ Question error: ${err}`);
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingQuestion: false,
        }));
      }

      // Generate audio for each option separately
      const optionAudioUrls: string[] = [];
      const optionTimestampsUrls: string[] = [];
      
      for (let optIdx = 0; optIdx < questionForm.options.length; optIdx++) {
        const optionText = questionForm.options[optIdx]?.trim();
        if (!optionText) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this option is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingOptions: [...prev.generatingOptions, optIdx],
        }));

        try {
          const optionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: optionText, 
              type: 'both',
              context: 'quiz' // Use woman's voice for quiz
            }),
          });

          if (optionResponse.ok) {
            const optionData = await optionResponse.json();
            optionAudioUrls.push(optionData.audioUrl);
            optionTimestampsUrls.push(optionData.timestampsUrl);
            results.push(`✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
          } else {
            const error = await optionResponse.json();
            optionAudioUrls.push("");
            optionTimestampsUrls.push("");
            results.push(`❌ Option ${optIdx + 1} failed: ${error.error || 'Unknown error'}`);
          }
        } catch (err) {
          optionAudioUrls.push("");
          optionTimestampsUrls.push("");
          results.push(`❌ Option ${optIdx + 1} error: ${err}`);
        } finally {
          // Update progress to show this option is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingOptions: prev.generatingOptions.filter(idx => idx !== optIdx),
            completed: {
              ...prev.completed,
              options: prev.completed.options.map((done, idx) => idx === optIdx ? true : done),
            },
          }));
        }
      }

      // Update form with option audio URLs
      setQuestionForm(prev => ({
        ...prev,
        optionAudioUrls: optionAudioUrls,
        optionTimestampsUrls: optionTimestampsUrls,
      }));

      // 2. Generate correct explanation audio
      const correctText = questionForm.explanation.correct.trim();
      setQuizGenerationProgress(prev => ({
        ...prev,
        generatingCorrectExplanation: true,
      }));
      
      try {
        const correctResponse = await fetch('/api/admin/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            text: correctText, 
            type: 'both',
            context: 'quiz' // Use woman's voice for quiz
          }),
        });

        if (correctResponse.ok) {
          const correctData = await correctResponse.json();
          results.push(`✅ Correct explanation audio: ${correctData.audioUrl}`);
          setQuestionForm(prev => ({
            ...prev,
            correctExplanationAudioUrl: correctData.audioUrl,
            correctExplanationTimestampsUrl: correctData.timestampsUrl,
          }));
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingCorrectExplanation: false,
            completed: { ...prev.completed, correctExplanation: true },
          }));
        } else {
          const error = await correctResponse.json();
          results.push(`❌ Correct explanation audio failed: ${error.error || 'Unknown error'}`);
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingCorrectExplanation: false,
          }));
        }
      } catch (err) {
        results.push(`❌ Correct explanation audio error: ${err}`);
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingCorrectExplanation: false,
        }));
      }

      // 3. Generate incorrect explanation audio for each option
      const incorrectTexts = questionForm.explanation.incorrect || [];
      const incorrectAudioUrls: string[] = [];
      const incorrectTimestampsUrls: string[] = [];

      for (let idx = 0; idx < incorrectTexts.length; idx++) {
        const incorrectText = incorrectTexts[idx]?.trim();
        if (!incorrectText) {
          incorrectAudioUrls.push("");
          incorrectTimestampsUrls.push("");
          setQuizGenerationProgress(prev => ({
            ...prev,
            completed: {
              ...prev.completed,
              incorrectExplanations: prev.completed.incorrectExplanations.map((done, i) => i === idx ? true : done),
            },
          }));
          continue;
        }

        // Update progress to show this incorrect explanation is being generated
        setQuizGenerationProgress(prev => ({
          ...prev,
          generatingIncorrectExplanations: [...prev.generatingIncorrectExplanations, idx],
        }));

        try {
          const incorrectResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: incorrectText, 
              type: 'both',
              context: 'quiz' // Use woman's voice for quiz
            }),
          });

          if (incorrectResponse.ok) {
            const incorrectData = await incorrectResponse.json();
            incorrectAudioUrls.push(incorrectData.audioUrl);
            incorrectTimestampsUrls.push(incorrectData.timestampsUrl);
            results.push(`✅ Option ${idx + 1} incorrect explanation audio: ${incorrectData.audioUrl}`);
          } else {
            const error = await incorrectResponse.json();
            incorrectAudioUrls.push("");
            incorrectTimestampsUrls.push("");
            results.push(`❌ Option ${idx + 1} incorrect explanation audio failed: ${error.error || 'Unknown error'}`);
          }
        } catch (err) {
          incorrectAudioUrls.push("");
          incorrectTimestampsUrls.push("");
          results.push(`❌ Option ${idx + 1} incorrect explanation audio error: ${err}`);
        } finally {
          // Update progress to show this incorrect explanation is completed
          setQuizGenerationProgress(prev => ({
            ...prev,
            generatingIncorrectExplanations: prev.generatingIncorrectExplanations.filter(i => i !== idx),
            completed: {
              ...prev.completed,
              incorrectExplanations: prev.completed.incorrectExplanations.map((done, i) => i === idx ? true : done),
            },
          }));
        }
      }

      // Update form with all incorrect audio URLs
      setQuestionForm(prev => ({
        ...prev,
        incorrectExplanationAudioUrls: incorrectAudioUrls,
        incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
      }));

      // Show summary alert
      const successCount = results.filter(r => r.startsWith('✅')).length;
      const failCount = results.filter(r => r.startsWith('❌')).length;
      alert(`Audio Generation Complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating all audio:', err);
      alert('Failed to generate all audio');
    } finally {
      setGeneratingAllAudio(false);
      setQuizGenerationProgress({
        generatingQuestion: false,
        generatingOptions: [],
        generatingCorrectExplanation: false,
        generatingIncorrectExplanations: [],
        completed: {
          question: false,
          options: [],
          correctExplanation: false,
          incorrectExplanations: [],
        },
      });
    }
  };

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
    // Initialize progress state when editing a question
    setQuizGenerationProgress({
      generatingQuestion: false,
      generatingOptions: [],
      generatingCorrectExplanation: false,
      generatingIncorrectExplanations: [],
      completed: {
        question: !!question.questionAudioUrl,
        options: (question.optionAudioUrls as string[] || []).map(url => !!url),
        correctExplanation: !!question.correctExplanationAudioUrl,
        incorrectExplanations: ((question.incorrectExplanationAudioUrls as string[] || [])).map(url => !!url),
      },
    });
  };

  const [objectiveForm, setObjectiveForm] = useState<Partial<LearningObjective>>({
    text: "",
    audioUrl: null,
    timestampsUrl: null,
    order: 0,
  });

  const [keyTermForm, setKeyTermForm] = useState<Partial<KeyTerm>>({
    term: "",
    audioUrl: null,
    timestampsUrl: null,
    order: 0,
  });

  // Bulk input states
  const [bulkObjectivesText, setBulkObjectivesText] = useState("");
  const [bulkKeyTermsText, setBulkKeyTermsText] = useState("");

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
        setObjectiveForm({ text: "", audioUrl: null, timestampsUrl: null, order: 0 });
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
        setKeyTermForm({ term: "", audioUrl: null, timestampsUrl: null, order: 0 });
      }
    } catch (err) {
      console.error("Error saving key term:", err);
    }
  };

  // Bulk add learning objectives
  const handleBulkAddObjectives = async () => {
    if (!bulkObjectivesText.trim()) {
      alert("Please enter at least one learning objective");
      return;
    }

    try {
      const token = getToken();
      const lines = bulkObjectivesText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        alert("No valid objectives found. Please enter objectives separated by new lines.");
        return;
      }

      // Create all objectives
      const promises = lines.map((text, index) => {
        return fetch("/api/admin/objectives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text,
            order: learningObjectives.length + index,
            chapterId: chapterId === "new" ? null : chapterId,
          }),
        });
      });

      await Promise.all(promises);
      await fetchChapter();
      setBulkObjectivesText("");
      alert(`Successfully added ${lines.length} learning objective(s)!`);
    } catch (err) {
      console.error("Error bulk adding objectives:", err);
      alert("Failed to add objectives. Please try again.");
    }
  };

  // Generate audio for each Learning Objective separately
  const handleGenerateObjectivesAudio = async () => {
    if (learningObjectives.length === 0) {
      alert("Please add learning objectives first");
      return;
    }

    try {
      setGeneratingObjectivesAudio(true);
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Generate audio for each objective separately
      for (let i = 0; i < learningObjectives.length; i++) {
        const objective = learningObjectives[i];
        
        try {
          const response = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: objective.text, 
              type: 'both',
              context: 'section' // Use man's voice for objectives
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update this objective with its own audio
            const updateResponse = await fetch(`/api/admin/objectives/${objective.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                text: objective.text,
                order: objective.order,
                audioUrl: data.audioUrl,
                timestampsUrl: data.timestampsUrl,
              }),
            });

            if (updateResponse.ok) {
              results.push(`✅ Objective ${i + 1}: ${data.audioUrl}`);
              successCount++;
            } else {
              const updateError = await updateResponse.json();
              results.push(`❌ Objective ${i + 1}: Generated but failed to update - ${updateError.error || 'Unknown error'}`);
              failCount++;
            }
          } else {
            const error = await response.json();
            results.push(`❌ Objective ${i + 1}: ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Objective ${i + 1}: ${err.message || err}`);
          failCount++;
        }
      }
      
      await fetchChapter();
      alert(`✅ Learning Objectives audio generation complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating objectives audio:', err);
      alert('Failed to generate objectives audio');
    } finally {
      setGeneratingObjectivesAudio(false);
    }
  };

  // Generate audio for each Key Term separately
  const handleGenerateKeyTermsAudio = async () => {
    if (keyTerms.length === 0) {
      alert("Please add key terms first");
      return;
    }

    try {
      setGeneratingKeyTermsAudio(true);
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Generate audio for each key term separately
      for (let i = 0; i < keyTerms.length; i++) {
        const keyTerm = keyTerms[i];
        
        try {
          const response = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: keyTerm.term, 
              type: 'both',
              context: 'section' // Use man's voice for key terms
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update this key term with its own audio
            const updateResponse = await fetch(`/api/admin/key-terms/${keyTerm.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                term: keyTerm.term,
                order: keyTerm.order,
                audioUrl: data.audioUrl,
                timestampsUrl: data.timestampsUrl,
              }),
            });

            if (updateResponse.ok) {
              results.push(`✅ Key Term ${i + 1}: ${data.audioUrl}`);
              successCount++;
            } else {
              const updateError = await updateResponse.json();
              results.push(`❌ Key Term ${i + 1}: Generated but failed to update - ${updateError.error || 'Unknown error'}`);
              failCount++;
            }
          } else {
            const error = await response.json();
            results.push(`❌ Key Term ${i + 1}: ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Key Term ${i + 1}: ${err.message || err}`);
          failCount++;
        }
      }
      
      await fetchChapter();
      alert(`✅ Key Terms audio generation complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating key terms audio:', err);
      alert('Failed to generate key terms audio');
    } finally {
      setGeneratingKeyTermsAudio(false);
    }
  };

  // Generate all audio for entire chapter
  const handleGenerateAllChapterAudio = async () => {
    if (!chapter) {
      alert("Chapter not loaded");
      return;
    }

    try {
      setGeneratingAllChapterAudio(true);
      const token = getToken();
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;

      // 1. Generate audio for all sections
      for (const section of sections) {
        if (!section.text || section.text.trim().length === 0) {
          results.push(`⏭️ Section "${section.title}": Skipped (no text)`);
          continue;
        }

        try {
          const response = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: section.text.trim(),
              type: 'both',
              context: 'section' // Use man's voice for sections
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Update section with generated audio - only update audio fields
            const updateResponse = await fetch(`/api/admin/sections/${section.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                sectionNumber: section.sectionNumber,
                title: section.title,
                text: section.text,
                type: section.type,
                order: section.order,
                audioUrl: data.audioUrl,
                timestampsUrl: data.timestampsUrl,
              }),
            });

            if (updateResponse.ok) {
              results.push(`✅ Section "${section.title}": ${data.audioUrl}`);
              successCount++;
            } else {
              const updateError = await updateResponse.json();
              results.push(`❌ Section "${section.title}": Generated but failed to update - ${updateError.error || 'Unknown error'}`);
              failCount++;
            }
          } else {
            const error = await response.json();
            results.push(`❌ Section "${section.title}": ${error.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Section "${section.title}": ${err.message || err}`);
          failCount++;
        }
      }

      // 2. Generate audio for each learning objective separately
      if (learningObjectives.length > 0) {
        for (let i = 0; i < learningObjectives.length; i++) {
          const objective = learningObjectives[i];
          try {
            const response = await fetch('/api/admin/generate-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                text: objective.text,
                type: 'both',
                context: 'section' // Use man's voice for objectives
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const updateResponse = await fetch(`/api/admin/objectives/${objective.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  text: objective.text,
                  order: objective.order,
                  audioUrl: data.audioUrl,
                  timestampsUrl: data.timestampsUrl,
                }),
              });

              if (updateResponse.ok) {
                results.push(`✅ Objective ${i + 1}: ${data.audioUrl}`);
                successCount++;
              } else {
                const updateError = await updateResponse.json();
                results.push(`❌ Objective ${i + 1}: Generated but failed to update - ${updateError.error || 'Unknown error'}`);
                failCount++;
              }
            } else {
              const error = await response.json();
              results.push(`❌ Objective ${i + 1}: ${error.error || 'Unknown error'}`);
              failCount++;
            }
          } catch (err: any) {
            results.push(`❌ Objective ${i + 1}: ${err.message || err}`);
            failCount++;
          }
        }
      }

      // 3. Generate audio for each key term separately
      if (keyTerms.length > 0) {
        for (let i = 0; i < keyTerms.length; i++) {
          const keyTerm = keyTerms[i];
          try {
            const response = await fetch('/api/admin/generate-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                text: keyTerm.term,
                type: 'both',
                context: 'section' // Use man's voice for key terms
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const updateResponse = await fetch(`/api/admin/key-terms/${keyTerm.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  term: keyTerm.term,
                  order: keyTerm.order,
                  audioUrl: data.audioUrl,
                  timestampsUrl: data.timestampsUrl,
                }),
              });

              if (updateResponse.ok) {
                results.push(`✅ Key Term ${i + 1}: ${data.audioUrl}`);
                successCount++;
              } else {
                const updateError = await updateResponse.json();
                results.push(`❌ Key Term ${i + 1}: Generated but failed to update - ${updateError.error || 'Unknown error'}`);
                failCount++;
              }
            } else {
              const error = await response.json();
              results.push(`❌ Key Term ${i + 1}: ${error.error || 'Unknown error'}`);
              failCount++;
            }
          } catch (err: any) {
            results.push(`❌ Key Term ${i + 1}: ${err.message || err}`);
            failCount++;
          }
        }
      }

      // 4. Generate audio for all quiz questions
      for (const question of quizQuestions) {
        if (!question.question || !question.options || question.options.length < 2) {
          results.push(`⏭️ Question: Skipped (incomplete)`);
          continue;
        }

        // Fetch latest question data to avoid stale data issues
        let currentQuestion = question;
        try {
          const questionFetchResponse = await fetch(`/api/admin/quiz-questions/${question.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (questionFetchResponse.ok) {
            const questionData = await questionFetchResponse.json();
            currentQuestion = questionData.question;
          }
        } catch (err) {
          console.warn(`Failed to fetch latest question data for ${question.id}, using cached data`);
        }

        // Generate separate audio for question and each option
        try {
          const questionText = currentQuestion.question.trim();
          
          // Generate audio for question only
          const questionResponse = await fetch('/api/admin/generate-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: questionText,
              type: 'both',
              context: 'quiz' // Use woman's voice for quiz
            }),
          });

          let questionAudioUrl: string | null = null;
          let questionTimestampsUrl: string | null = null;

          if (questionResponse.ok) {
            const questionData = await questionResponse.json();
            questionAudioUrl = questionData.audioUrl;
            questionTimestampsUrl = questionData.timestampsUrl;
            results.push(`✅ Question Text: ${questionData.audioUrl}`);
            successCount++;
          } else {
            const error = await questionResponse.json();
            results.push(`❌ Question Text: ${error.error || 'Unknown error'}`);
            failCount++;
          }

          // Generate audio for each option separately
          const optionAudioUrls: string[] = [];
          const optionTimestampsUrls: string[] = [];
          
          for (let optIdx = 0; optIdx < currentQuestion.options.length; optIdx++) {
            const optionText = currentQuestion.options[optIdx]?.trim();
            if (!optionText) {
              optionAudioUrls.push("");
              optionTimestampsUrls.push("");
              continue;
            }

            try {
              const optionResponse = await fetch('/api/admin/generate-audio', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  text: optionText,
                  type: 'both',
                  context: 'quiz' // Use woman's voice for quiz
                }),
              });

              if (optionResponse.ok) {
                const optionData = await optionResponse.json();
                optionAudioUrls.push(optionData.audioUrl);
                optionTimestampsUrls.push(optionData.timestampsUrl);
                results.push(`  ✅ Option ${optIdx + 1}: ${optionData.audioUrl}`);
                successCount++;
              } else {
                const error = await optionResponse.json();
                optionAudioUrls.push("");
                optionTimestampsUrls.push("");
                results.push(`  ❌ Option ${optIdx + 1}: ${error.error || 'Unknown error'}`);
                failCount++;
              }
            } catch (err: any) {
              optionAudioUrls.push("");
              optionTimestampsUrls.push("");
              results.push(`  ❌ Option ${optIdx + 1}: ${err.message || err}`);
              failCount++;
            }
          }

          // Update question with all audio URLs
          const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              question: currentQuestion.question,
              options: currentQuestion.options,
              correctAnswer: currentQuestion.correctAnswer,
              explanation: currentQuestion.explanation,
              chapterId: currentQuestion.chapterId,
              quizType: currentQuestion.quizType,
              order: currentQuestion.order,
              questionAudioUrl: questionAudioUrl,
              questionTimestampsUrl: questionTimestampsUrl,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
            }),
          });

          if (updateResponse.ok) {
            // Update currentQuestion with new audio URLs
            currentQuestion = { 
              ...currentQuestion, 
              questionAudioUrl: questionAudioUrl || undefined,
              questionTimestampsUrl: questionTimestampsUrl || undefined,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
            };
          } else {
            const updateError = await updateResponse.json();
            results.push(`❌ Question Update Failed: ${updateError.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (err: any) {
          results.push(`❌ Question "${currentQuestion.question.substring(0, 30)}...": ${err.message || err}`);
          failCount++;
        }

        // Generate correct explanation audio
        if (currentQuestion.explanation?.correct?.trim()) {
          try {
            const correctResponse = await fetch('/api/admin/generate-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                text: currentQuestion.explanation.correct.trim(),
                type: 'both',
                context: 'quiz'
              }),
            });

            if (correctResponse.ok) {
              const correctData = await correctResponse.json();
              
              // Update question with correct explanation audio - only update explanation audio fields
              const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: currentQuestion.explanation,
                  chapterId: currentQuestion.chapterId,
                  quizType: currentQuestion.quizType,
                  order: currentQuestion.order,
                  audioUrl: currentQuestion.audioUrl,
                  timestampsUrl: currentQuestion.timestampsUrl,
                  correctExplanationAudioUrl: correctData.audioUrl,
                  correctExplanationTimestampsUrl: correctData.timestampsUrl,
                }),
              });

              if (updateResponse.ok) {
                results.push(`  ✅ Correct Explanation: ${correctData.audioUrl}`);
                successCount++;
                // Update currentQuestion with new explanation audio URLs
                currentQuestion = { 
                  ...currentQuestion, 
                  correctExplanationAudioUrl: correctData.audioUrl, 
                  correctExplanationTimestampsUrl: correctData.timestampsUrl 
                };
              } else {
                const updateError = await updateResponse.json();
                results.push(`  ❌ Correct Explanation: Failed to update - ${updateError.error || 'Unknown error'}`);
                failCount++;
              }
            } else {
              const error = await correctResponse.json();
              results.push(`  ❌ Correct Explanation: ${error.error || 'Unknown error'}`);
              failCount++;
            }
          } catch (err: any) {
            results.push(`  ❌ Correct Explanation: ${err.message || err}`);
            failCount++;
          }
        }

        // Generate incorrect explanation audio for each option
        if (currentQuestion.explanation?.incorrect && currentQuestion.explanation.incorrect.length > 0) {
          const incorrectAudioUrls: string[] = [];
          const incorrectTimestampsUrls: string[] = [];
          let hasValidAudio = false;

          for (let idx = 0; idx < currentQuestion.explanation.incorrect.length; idx++) {
            const incorrectText = currentQuestion.explanation.incorrect[idx]?.trim();
            if (!incorrectText) {
              incorrectAudioUrls.push("");
              incorrectTimestampsUrls.push("");
              continue;
            }

            try {
              const incorrectResponse = await fetch('/api/admin/generate-audio', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  text: incorrectText,
                  type: 'both',
                  context: 'quiz'
                }),
              });

              if (incorrectResponse.ok) {
                const incorrectData = await incorrectResponse.json();
                incorrectAudioUrls.push(incorrectData.audioUrl);
                incorrectTimestampsUrls.push(incorrectData.timestampsUrl);
                results.push(`  ✅ Option ${idx + 1} Incorrect Explanation: ${incorrectData.audioUrl}`);
                successCount++;
                hasValidAudio = true;
              } else {
                const error = await incorrectResponse.json();
                incorrectAudioUrls.push("");
                incorrectTimestampsUrls.push("");
                results.push(`  ❌ Option ${idx + 1} Incorrect Explanation: ${error.error || 'Unknown error'}`);
                failCount++;
              }
            } catch (err: any) {
              incorrectAudioUrls.push("");
              incorrectTimestampsUrls.push("");
              results.push(`  ❌ Option ${idx + 1} Incorrect Explanation: ${err.message || err}`);
              failCount++;
            }
          }

          // Update question with incorrect explanation audio URLs - only if we have valid audio
          if (hasValidAudio && incorrectAudioUrls.length > 0) {
            try {
              const updateResponse = await fetch(`/api/admin/quiz-questions/${currentQuestion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: currentQuestion.explanation,
                  chapterId: currentQuestion.chapterId,
                  quizType: currentQuestion.quizType,
                  order: currentQuestion.order,
                  audioUrl: currentQuestion.audioUrl,
                  timestampsUrl: currentQuestion.timestampsUrl,
                  correctExplanationAudioUrl: currentQuestion.correctExplanationAudioUrl,
                  correctExplanationTimestampsUrl: currentQuestion.correctExplanationTimestampsUrl,
                  incorrectExplanationAudioUrls: incorrectAudioUrls,
                  incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
                }),
              });

              if (!updateResponse.ok) {
                const updateError = await updateResponse.json();
                results.push(`  ⚠️ Failed to update incorrect explanation URLs: ${updateError.error || 'Unknown error'}`);
              }
            } catch (err: any) {
              results.push(`  ⚠️ Failed to update incorrect explanation URLs: ${err.message || err}`);
            }
          }
        }
      }

      // Refresh chapter data
      await fetchChapter();

      // Show summary
      alert(`Chapter Audio Generation Complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n\n${results.join('\n')}`);
    } catch (err) {
      console.error('Error generating all chapter audio:', err);
      alert('Failed to generate all chapter audio');
    } finally {
      setGeneratingAllChapterAudio(false);
    }
  };

  // Bulk add key terms
  const handleBulkAddKeyTerms = async () => {
    if (!bulkKeyTermsText.trim()) {
      alert("Please enter at least one key term");
      return;
    }

    try {
      const token = getToken();
      const lines = bulkKeyTermsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        alert("No valid key terms found. Please enter key terms separated by new lines.");
        return;
      }

      // Create all key terms
      const promises = lines.map((term, index) => {
        return fetch("/api/admin/key-terms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            term,
            order: keyTerms.length + index,
            chapterId: chapterId === "new" ? null : chapterId,
          }),
        });
      });

      await Promise.all(promises);
      await fetchChapter();
      setBulkKeyTermsText("");
      alert(`Successfully added ${lines.length} key term(s)!`);
    } catch (err) {
      console.error("Error bulk adding key terms:", err);
      alert("Failed to add key terms. Please try again.");
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
            <div className="flex gap-4 mt-4 flex-wrap">
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
                onClick={handleGenerateAllChapterAudio}
                disabled={generatingAllChapterAudio}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm"
              >
                {generatingAllChapterAudio ? "🔄 Generating All Audio..." : "🎙️ Generate All Audio & Timestamps"}
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
            {learningObjectives.length > 0 && (
              <button
                onClick={handleGenerateObjectivesAudio}
                disabled={generatingObjectivesAudio}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300"
              >
                {generatingObjectivesAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
              </button>
            )}
          </div>

          {/* Status Display for Combined Audio */}
          {learningObjectives.length > 0 && learningObjectives[0] && (learningObjectives[0].audioUrl || learningObjectives[0].timestampsUrl) && (
            <div className="mb-6 p-4 bg-[#0a0e27]/70 border border-green-500/40 rounded-lg">
              <div className="flex gap-4 text-sm text-gray-300">
                {learningObjectives[0].audioUrl && <span>🎵 Audio: ✓</span>}
                {learningObjectives[0].timestampsUrl && <span>📝 Timestamps: ✓</span>}
              </div>
            </div>
          )}
          
          {/* Bulk Input Area */}
          <div className="mb-6 p-4 bg-[#0a0e27]/50 border border-green-500/30 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Multiple Learning Objectives (one per line)
            </label>
            <textarea
              value={bulkObjectivesText}
              onChange={(e) => setBulkObjectivesText(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-[#0a0e27]/70 border border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
              placeholder="Enter learning objectives, one per line:&#10;Objective 1&#10;Objective 2&#10;Objective 3"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleBulkAddObjectives}
                disabled={!bulkObjectivesText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300"
              >
                Add All Objectives
              </button>
            </div>
          </div>

          {/* Existing Objectives List */}
          <div className="space-y-2">
            {learningObjectives.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No learning objectives yet. Add them using the textarea above.
              </div>
            ) : (
              learningObjectives.map((obj) => (
                <div key={obj.id} className="p-3 bg-[#0a0e27]/50 border border-green-500/20 rounded-lg flex justify-between items-center">
                  <div className="flex-1">
                    <span className="text-white">{obj.text}</span>
                  </div>
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
              ))
            )}
          </div>
        </div>

        {/* Key Terms */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-yellow-500/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Key Terms</h2>
            {keyTerms.length > 0 && (
              <button
                onClick={handleGenerateKeyTermsAudio}
                disabled={generatingKeyTermsAudio}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
              >
                {generatingKeyTermsAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
              </button>
            )}
          </div>

          {/* Status Display for Combined Audio */}
          {keyTerms.length > 0 && keyTerms[0] && (keyTerms[0].audioUrl || keyTerms[0].timestampsUrl) && (
            <div className="mb-6 p-4 bg-[#0a0e27]/70 border border-yellow-500/40 rounded-lg">
              <div className="flex gap-4 text-sm text-gray-300">
                {keyTerms[0].audioUrl && <span>🎵 Audio: ✓</span>}
                {keyTerms[0].timestampsUrl && <span>📝 Timestamps: ✓</span>}
              </div>
            </div>
          )}
          
          {/* Bulk Input Area */}
          <div className="mb-6 p-4 bg-[#0a0e27]/50 border border-yellow-500/30 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Multiple Key Terms (one per line)
            </label>
            <textarea
              value={bulkKeyTermsText}
              onChange={(e) => setBulkKeyTermsText(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-[#0a0e27]/70 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
              placeholder="Enter key terms, one per line:&#10;Term 1&#10;Term 2&#10;Term 3"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleBulkAddKeyTerms}
                disabled={!bulkKeyTermsText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
              >
                Add All Key Terms
              </button>
            </div>
          </div>

          {/* Existing Key Terms List */}
          <div className="space-y-2">
            {keyTerms.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No key terms yet. Add them using the textarea above.
              </div>
            ) : (
              keyTerms.map((term) => (
                <div key={term.id} className="p-3 bg-[#0a0e27]/50 border border-yellow-500/20 rounded-lg flex justify-between items-center">
                  <div className="flex-1">
                    <span className="text-white">{term.term}</span>
                  </div>
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
              ))
            )}
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Text Content
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGenerateAudio(sectionForm.text || "")}
                      disabled={generatingAudio || !sectionForm.text || sectionForm.text.trim().length === 0}
                      className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingAudio ? "🔄 Generating..." : "🎙️ Generate Audio & Timestamps"}
                    </button>
                  </div>
                  <textarea
                    value={sectionForm.text || ""}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, text: e.target.value })
                    }
                    rows={8}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white"
                    placeholder="Enter section text content..."
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Question
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateQuestionAudio}
                      disabled={generatingQuestionAudio || !questionForm.question || questionForm.question.trim().length === 0}
                      className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingQuestionAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                    </button>
                  </div>
                  <textarea
                    value={questionForm.question || ""}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                    placeholder="Enter the question text..."
                  />
                  {/* Progress indicator for question */}
                  {generatingQuestionAudio && (
                    <div className="mt-2 text-xs">
                      <p className="text-yellow-400 animate-pulse">
                        🔄 Generating question audio...
                      </p>
                    </div>
                  )}
                  {quizGenerationProgress.completed.question && !generatingQuestionAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question audio generated
                    </p>
                  )}
                  {questionForm.questionAudioUrl && questionForm.questionTimestampsUrl && !generatingQuestionAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question: Audio & Timestamps ready
                    </p>
                  )}
                  {questionForm.audioUrl && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Legacy combined audio: {questionForm.audioUrl} (use separate question/option audio instead)
                    </p>
                  )}
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
                  {(questionForm.options || []).map((option, idx) => {
                    const isGenerating = quizGenerationProgress.generatingOptions.includes(idx);
                    const isCompleted = quizGenerationProgress.completed.options[idx];
                    const optionAudioUrls = (questionForm.optionAudioUrls || []) as string[];
                    const optionTimestampsUrls = (questionForm.optionTimestampsUrls || []) as string[];
                    const hasAudio = optionAudioUrls[idx] && optionTimestampsUrls[idx];
                    
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-2">
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
                        {/* Progress indicator for this option */}
                        {(generatingQuizAudio || generatingAllAudio) && (
                          <div className="ml-6 mt-1 text-xs">
                            {isGenerating && (
                              <span className="text-yellow-400 animate-pulse">
                                🔄 Generating audio for Option {idx + 1}...
                              </span>
                            )}
                            {isCompleted && !isGenerating && (
                              <span className="text-green-400">
                                ✅ Option {idx + 1} audio generated
                              </span>
                            )}
                            {!isGenerating && !isCompleted && quizGenerationProgress.completed.question && (
                              <span className="text-gray-400">
                                ⏳ Waiting to generate Option {idx + 1}...
                              </span>
                            )}
                          </div>
                        )}
                        {/* Show audio status if available */}
                        {hasAudio && !generatingQuizAudio && !generatingAllAudio && (
                          <div className="ml-6 mt-1 text-xs text-green-400">
                            ✅ Option {idx + 1}: Audio & Timestamps ready
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(questionForm.options || []).length < 2 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ At least 2 options are required
                    </p>
                  )}
                  <div className="mt-3 flex justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAllAudio}
                      disabled={generatingAllAudio || !questionForm.question || (questionForm.options || []).length < 2 || !questionForm.explanation?.correct?.trim() || !questionForm.explanation?.incorrect || questionForm.explanation.incorrect.length === 0}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingAllAudio ? "🔄 Generating All Audio..." : "🎙️ Generate All Audio"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateQuizAudio}
                      disabled={generatingQuizAudio || generatingAllAudio || !questionForm.question || (questionForm.options || []).length < 2}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingQuizAudio ? (
                        quizGenerationProgress.generatingQuestion 
                          ? "🔄 Generating Question..." 
                          : `🔄 Generating Options (${quizGenerationProgress.completed.options.filter(Boolean).length}/${(questionForm.options || []).length})...`
                      ) : "🎙️ Question & Options"}
                    </button>
                  </div>
                  {/* Progress indicator for question */}
                  {generatingQuizAudio && (
                    <div className="mt-2 text-xs">
                      {quizGenerationProgress.generatingQuestion && (
                        <p className="text-yellow-400 animate-pulse">
                          🔄 Generating question audio...
                        </p>
                      )}
                      {quizGenerationProgress.completed.question && !quizGenerationProgress.generatingQuestion && (
                        <p className="text-green-400">
                          ✅ Question audio generated
                        </p>
                      )}
                    </div>
                  )}
                  {questionForm.questionAudioUrl && questionForm.questionTimestampsUrl && !generatingQuizAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Question: Audio & Timestamps ready
                    </p>
                  )}
                  {questionForm.audioUrl && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Legacy combined audio: {questionForm.audioUrl} (use separate question/option audio instead)
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Correct Answer Explanation
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCorrectExplanationAudio}
                      disabled={generatingCorrectExplanationAudio || !questionForm.explanation?.correct?.trim()}
                      className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingCorrectExplanationAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                    </button>
                  </div>
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
                  {/* Progress indicator for correct explanation */}
                  {generatingCorrectExplanationAudio && (
                    <div className="mt-2 text-xs">
                      <p className="text-yellow-400 animate-pulse">
                        🔄 Generating correct explanation audio...
                      </p>
                    </div>
                  )}
                  {quizGenerationProgress.completed.correctExplanation && !generatingCorrectExplanationAudio && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Correct explanation audio generated
                    </p>
                  )}
                  {questionForm.correctExplanationAudioUrl && !generatingCorrectExplanationAudio && !quizGenerationProgress.generatingCorrectExplanation && (
                    <p className="text-xs text-green-400 mt-2">
                      ✅ Correct Audio: {questionForm.correctExplanationAudioUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incorrect Answer Explanations (one per line)
                  </label>
                  <div className="space-y-2">
                    {(questionForm.explanation?.incorrect || []).map((incorrectText, idx) => {
                      const isGenerating = quizGenerationProgress.generatingIncorrectExplanations.includes(idx);
                      const isCompleted = quizGenerationProgress.completed.incorrectExplanations[idx];
                      const incorrectAudioUrls = (questionForm.incorrectExplanationAudioUrls || []) as string[];
                      const incorrectTimestampsUrls = (questionForm.incorrectExplanationTimestampsUrls || []) as string[];
                      const hasAudio = incorrectAudioUrls[idx] && incorrectTimestampsUrls[idx];
                      
                      return (
                        <div key={idx}>
                          <div className="flex gap-2 items-start">
                            <textarea
                              value={incorrectText}
                              onChange={(e) => {
                                const newIncorrect = [...(questionForm.explanation?.incorrect || [])];
                                newIncorrect[idx] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  explanation: {
                                    ...questionForm.explanation,
                                    correct: questionForm.explanation?.correct || "",
                                    incorrect: newIncorrect,
                                  },
                                });
                              }}
                              rows={2}
                              className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white"
                              placeholder={`Explanation for incorrect option ${idx + 1}...`}
                            />
                            <button
                              type="button"
                              onClick={() => handleGenerateIncorrectExplanationAudio(idx)}
                              disabled={generatingIncorrectExplanationAudio === idx || generatingAllAudio || !incorrectText?.trim()}
                              className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {generatingIncorrectExplanationAudio === idx || isGenerating ? "🔄..." : "🎙️ Generate"}
                            </button>
                          </div>
                          {/* Progress indicator for this incorrect explanation */}
                          {(generatingIncorrectExplanationAudio === idx || generatingAllAudio || isGenerating) && (
                            <div className="ml-2 mt-1 text-xs">
                              {isGenerating && (
                                <span className="text-yellow-400 animate-pulse">
                                  🔄 Generating audio for incorrect explanation {idx + 1}...
                                </span>
                              )}
                              {isCompleted && !isGenerating && (
                                <span className="text-green-400">
                                  ✅ Incorrect explanation {idx + 1} audio generated
                                </span>
                              )}
                            </div>
                          )}
                          {/* Show audio status if available */}
                          {hasAudio && !isGenerating && generatingIncorrectExplanationAudio !== idx && !generatingAllAudio && (
                            <div className="ml-2 mt-1 text-xs text-green-400">
                              ✅ Option {idx + 1} Audio: {incorrectAudioUrls[idx]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-purple-500/30 rounded-lg text-white mt-2"
                    placeholder="One explanation per line (or use individual fields above)..."
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Objective Text
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!objectiveForm.text || objectiveForm.text.trim().length === 0) {
                          alert("Please enter objective text first");
                          return;
                        }
                        try {
                          setGeneratingObjectivesAudio(true);
                          const token = getToken();
                          
                          const response = await fetch('/api/admin/generate-audio', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ 
                              text: objectiveForm.text, 
                              type: 'both',
                              context: 'section' // Use man's voice
                            }),
                          });

                          if (response.ok) {
                            const data = await response.json();
                            setObjectiveForm({
                              ...objectiveForm,
                              audioUrl: data.audioUrl,
                              timestampsUrl: data.timestampsUrl,
                            });
                            alert(`✅ Audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
                          } else {
                            const error = await response.json();
                            alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
                          }
                        } catch (err) {
                          console.error('Error generating audio:', err);
                          alert('Failed to generate audio');
                        } finally {
                          setGeneratingObjectivesAudio(false);
                        }
                      }}
                      disabled={generatingObjectivesAudio || !objectiveForm.text || objectiveForm.text.trim().length === 0}
                      className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingObjectivesAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                    </button>
                  </div>
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
                    Audio URL
                  </label>
                  <input
                    type="text"
                    value={objectiveForm.audioUrl || ""}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, audioUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                    placeholder="/audio/chapter1-objectives.mp3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timestamps URL
                  </label>
                  <input
                    type="text"
                    value={objectiveForm.timestampsUrl || ""}
                    onChange={(e) =>
                      setObjectiveForm({ ...objectiveForm, timestampsUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                    placeholder="/timestamps/chapter1-objectives.timestamps.json"
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Term
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!keyTermForm.term || keyTermForm.term.trim().length === 0) {
                          alert("Please enter key term first");
                          return;
                        }
                        try {
                          setGeneratingKeyTermsAudio(true);
                          const token = getToken();
                          
                          const response = await fetch('/api/admin/generate-audio', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ 
                              text: keyTermForm.term, 
                              type: 'both',
                              context: 'section' // Use man's voice
                            }),
                          });

                          if (response.ok) {
                            const data = await response.json();
                            setKeyTermForm({
                              ...keyTermForm,
                              audioUrl: data.audioUrl,
                              timestampsUrl: data.timestampsUrl,
                            });
                            alert(`✅ Audio and timestamps generated successfully!\n\nAudio: ${data.audioUrl}\nTimestamps: ${data.timestampsUrl}`);
                          } else {
                            const error = await response.json();
                            alert(`❌ Generation failed: ${error.error || 'Unknown error'}`);
                          }
                        } catch (err) {
                          console.error('Error generating audio:', err);
                          alert('Failed to generate audio');
                        } finally {
                          setGeneratingKeyTermsAudio(false);
                        }
                      }}
                      disabled={generatingKeyTermsAudio || !keyTermForm.term || keyTermForm.term.trim().length === 0}
                      className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingKeyTermsAudio ? "🔄 Generating..." : "🎙️ Generate Audio"}
                    </button>
                  </div>
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
                    Audio URL
                  </label>
                  <input
                    type="text"
                    value={keyTermForm.audioUrl || ""}
                    onChange={(e) =>
                      setKeyTermForm({ ...keyTermForm, audioUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-yellow-500/30 rounded-lg text-white"
                    placeholder="/audio/chapter1-keyterms.mp3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timestamps URL
                  </label>
                  <input
                    type="text"
                    value={keyTermForm.timestampsUrl || ""}
                    onChange={(e) =>
                      setKeyTermForm({ ...keyTermForm, timestampsUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-yellow-500/30 rounded-lg text-white"
                    placeholder="/timestamps/chapter1-keyterms.timestamps.json"
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

