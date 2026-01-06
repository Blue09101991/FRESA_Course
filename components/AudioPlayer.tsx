"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface TimestampsData {
  text: string;
  segments: Array<{
    words: WordTimestamp[];
  }>;
}

interface AudioPlayerProps {
  text: string;
  audioUrl?: string;
  timestampsUrl?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  highlightQuery?: string;
  hideText?: boolean; // Hide text display, show only controls
  onHighlightedWord?: (word: string, wordIndex: number) => void; // Callback when word is highlighted
}

export default function AudioPlayer({
  text,
  audioUrl,
  timestampsUrl,
  autoPlay = false,
  onComplete,
  onTimeUpdate,
  onPlayingChange,
  highlightQuery,
  hideText = false,
  onHighlightedWord,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);
  const [wordMap, setWordMap] = useState<Map<number, number>>(new Map());
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false); // Track if audio has completed
  // Load playbackRate from localStorage on mount, default to 1
  const [playbackRate, setPlaybackRate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioPlaybackRate');
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const lastHighlightedIndexRef = useRef<number>(-1);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Split text into words for highlighting - memoize to prevent recalculation
  // Split by spaces to get actual words only (no spaces)
  const words = useMemo(() => text.split(/\s+/).filter(word => word.length > 0), [text]);
  
  // Parse text into structured blocks for display (numbered lists on separate lines)
  // This creates visual structure without modifying the original text for timestamp matching
  const textBlocks = useMemo(() => {
    const blocks: Array<{ text: string; isNumberedItem: boolean; wordStartIndex: number }> = [];
    
    // Check if text contains numbered list items (1., 2., 3., etc.)
    // Pattern: look for space + single/multi-digit number + period + space (e.g., " 1. " or " 2. ")
    // Must be followed by a capital letter or be at the start of text
    // This avoids matching numbers in sentences like "$100,000" or "over 10 units"
    const numberedListPattern = /(?<=\s|^)\d+\.\s(?=[A-Z]|$)/;
    const hasNumberedList = numberedListPattern.test(text);
    
    if (!hasNumberedList) {
      // No numbered list found - return entire text as single block (regular paragraph)
      return [{
        text: text.trim(),
        isNumberedItem: false,
        wordStartIndex: 0
      }];
    }
    
    // Split text by numbered items (1., 2., 3., etc.) to create visual structure
    // Pattern: split before "number. " that appears after space or at start, followed by capital letter
    // This ensures we only split on actual list items, not numbers in sentences
    const parts = text.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
    
    let wordIndex = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Check if this part starts with a numbered item (number. at the start)
      const isNumberedItem = /^\d+\.\s/.test(trimmed);
      const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
      
      blocks.push({
        text: trimmed,
        isNumberedItem,
        wordStartIndex: wordIndex
      });
      
      wordIndex += wordCount;
    }
    
    return blocks;
  }, [text]);
  
  // Keep original split with spaces for display, preserving all structure
  // DO NOT modify the text - it must match timestamps exactly
  const wordsWithSpaces = useMemo(() => {
    // Split by spaces but preserve the structure (including line breaks, etc.)
    return text.split(/(\s+)/);
  }, [text]);
  
  // Pre-calculate word index for each segment to avoid recalculation on every render
  const segmentWordIndices = useMemo(() => {
    const indices: (number | null)[] = [];
    let wordCount = 0;
    for (let i = 0; i < wordsWithSpaces.length; i++) {
      if (wordsWithSpaces[i].trim().length > 0) {
        indices.push(wordCount);
        wordCount++;
      } else {
        indices.push(null); // Space segment
      }
    }
    return indices;
  }, [wordsWithSpaces]);

  // Reset hasPlayed and hasCompleted when audioUrl changes (new section loaded)
  useEffect(() => {
    if (audioUrl) {
      setHasPlayed(false);
      setHasCompleted(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setHighlightedIndex(-1);
    }
  }, [audioUrl]);

  // Load timestamps JSON - only once, use ref to prevent multiple loads
  const timestampsLoadedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (timestampsUrl && timestampsLoadedRef.current !== timestampsUrl) {
      timestampsLoadedRef.current = timestampsUrl;
      
      // Use AbortController to cancel if component unmounts
      const controller = new AbortController();
      
      // Add a small delay to prevent blocking the main thread
      const timeoutId = setTimeout(() => {
        fetch(timestampsUrl, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: TimestampsData) => {
          // Extract all words from segments - these are the ACTUAL spoken words with timestamps
          const allWords: WordTimestamp[] = [];
          data.segments.forEach((segment) => {
            allWords.push(...segment.words);
          });
          setWordTimestamps(allWords);

          // Create a map from text word index to timestamp word index
          // Use timestamp words as the source of truth - they represent what was actually spoken
          const map = new Map<number, number>();
          
          // Normalize word for comparison (remove punctuation, lowercase)
          const normalizeWord = (word: string): string => {
            return word.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
          };
          
          // More flexible word matching
          const wordsMatch = (textWord: string, timestampWord: string): boolean => {
            const textNorm = normalizeWord(textWord);
            const timestampNorm = normalizeWord(timestampWord);
            
            // Exact match after normalization
            if (textNorm === timestampNorm) return true;
            
            // Remove all non-alphanumeric characters and compare
            const textClean = textNorm.replace(/[^a-z0-9]/g, '');
            const timestampClean = timestampNorm.replace(/[^a-z0-9]/g, '');
            if (textClean === timestampClean && textClean.length > 0) return true;
            
            // Handle cases where one word contains the other (e.g., "Mr." vs "Mr")
            if (textClean.length > 0 && timestampClean.length > 0) {
              if (textClean.includes(timestampClean) || timestampClean.includes(textClean)) {
                // Only match if lengths are similar (within 3 characters)
                if (Math.abs(textClean.length - timestampClean.length) <= 3) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          // CRITICAL: Use timestamp words as the PRIMARY source of truth
          // They represent what was ACTUALLY spoken in the audio
          // Match each timestamp word to the corresponding text word sequentially
          
          let timestampIndex = 0;
          let textIndex = 0;
          
          // Simple sequential matching: go through timestamp words and match to text words
          for (timestampIndex = 0; timestampIndex < allWords.length; timestampIndex++) {
            const timestampWord = allWords[timestampIndex].text;
            
            // Find the matching text word starting from current position
            let matched = false;
            const searchWindow = 5; // Look ahead up to 5 words
            
            for (let i = 0; i < searchWindow && textIndex + i < words.length; i++) {
              const candidateTextWord = words[textIndex + i].trim();
              if (candidateTextWord && wordsMatch(candidateTextWord, timestampWord)) {
                // Found a match!
                // Map all text words from current position to this match to the same timestamp
                // (handles cases where text has extra words)
                for (let j = 0; j <= i; j++) {
                  if (textIndex + j < words.length && words[textIndex + j].trim()) {
                    map.set(textIndex + j, timestampIndex);
                  }
                }
                textIndex += i + 1; // Move past the matched word
                matched = true;
                break;
              }
            }
            
            // If no match found, map current text word to this timestamp (best guess)
            if (!matched && textIndex < words.length) {
              if (words[textIndex].trim()) {
                map.set(textIndex, timestampIndex);
                textIndex++;
              }
            }
          }
          
          // Map any remaining text words to the last timestamp
          while (textIndex < words.length) {
            if (words[textIndex].trim()) {
              map.set(textIndex, allWords.length - 1);
            }
            textIndex++;
          }
          
          // Log mapping for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Word mapping completed:', {
              textWords: words.length,
              timestampWords: allWords.length,
              mappedWords: map.size,
              sampleMappings: Array.from(map.entries()).slice(0, 10).map(([textIdx, tsIdx]) => ({
                textWord: words[textIdx],
                timestampWord: allWords[tsIdx]?.text,
                timestampIdx: tsIdx,
                timestampStart: allWords[tsIdx]?.start,
                timestampEnd: allWords[tsIdx]?.end,
              })),
              firstFewTimestamps: allWords.slice(0, 5).map(ts => ({
                text: ts.text,
                start: ts.start,
                end: ts.end,
              })),
            });
          }
          
          setWordMap(map);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error("Failed to load timestamps:", err);
          }
        });
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [timestampsUrl, words]); // Include words since we need it for mapping


  // Use refs to avoid dependency issues
  const wordTimestampsRef = useRef<WordTimestamp[]>([]);
  const wordMapRef = useRef<Map<number, number>>(new Map());
  const wordsRefForHighlight = useRef<string[]>([]);

  // Update refs when state changes
  useEffect(() => {
    wordTimestampsRef.current = wordTimestamps;
  }, [wordTimestamps]);

  useEffect(() => {
    wordMapRef.current = wordMap;
  }, [wordMap]);

  useEffect(() => {
    wordsRefForHighlight.current = words;
  }, [words]);

  // Throttle updates to prevent excessive re-renders
  const lastUpdateTime = useRef<number>(0);
  const updateInterval = 15; // Update every 15ms for very smooth and responsive highlighting

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const now = Date.now();
      // Throttle updates to prevent excessive re-renders
      if (now - lastUpdateTime.current < updateInterval) {
        return;
      }
      lastUpdateTime.current = now;

      const current = audio.currentTime;
      setCurrentTime(current);
      if (onTimeUpdate) {
        onTimeUpdate(current, audio.duration);
      }

      // Use refs directly to avoid dependency issues
      const currentWords = wordsRefForHighlight.current;
      const currentWordTimestamps = wordTimestampsRef.current;
      const currentWordMap = wordMapRef.current;

      let highlightedIndex = -1;
      if (currentWordTimestamps.length > 0 && currentWordMap.size > 0) {
        // CRITICAL: Use timestamp words as PRIMARY source - they have EXACT timing
        // Step 1: Find which TIMESTAMP word is currently being spoken (using exact timestamps)
        // Step 2: Find which TEXT word corresponds to that timestamp word
        
        let activeTimestampIndex = -1;
        let closestTimestampIndex = -1;
        let closestTimestampDistance = Infinity;
        
        // Find the active timestamp word using EXACT timestamps from JSON
        // These timestamps are the SOURCE OF TRUTH - they match the actual audio
        for (let tsIdx = 0; tsIdx < currentWordTimestamps.length; tsIdx++) {
          const wordTimestamp = currentWordTimestamps[tsIdx];
          
          // Use EXACT start and end times - highlight when current time is within range
          // Note: We use >= for start and < for end to match exactly when word is spoken
          if (current >= wordTimestamp.start && current < wordTimestamp.end) {
            activeTimestampIndex = tsIdx;
            break; // Found the active timestamp word - use it immediately
          }
          
          // Track closest timestamp for fallback (if we're between words)
          const distanceToStart = Math.abs(current - wordTimestamp.start);
          if (distanceToStart < closestTimestampDistance) {
            closestTimestampDistance = distanceToStart;
            closestTimestampIndex = tsIdx;
          }
        }
        
        // Use active timestamp if found, otherwise use closest one if very close
        const targetTimestampIndex = activeTimestampIndex >= 0 
          ? activeTimestampIndex 
          : (closestTimestampIndex >= 0 && closestTimestampDistance < 0.1 ? closestTimestampIndex : -1);
        
        if (targetTimestampIndex >= 0) {
          // Find the TEXT word that maps to this timestamp word
          // Search through all text words to find which one maps to this timestamp
          for (let textIdx = 0; textIdx < currentWords.length; textIdx++) {
            const mappedTimestampIdx = currentWordMap.get(textIdx);
            if (mappedTimestampIdx === targetTimestampIndex) {
              highlightedIndex = textIdx;
              break; // Found the matching text word
            }
          }
          
          // If no exact match, find the closest text word
          if (highlightedIndex === -1) {
            let minDistance = Infinity;
            for (let textIdx = 0; textIdx < currentWords.length; textIdx++) {
              const mappedTimestampIdx = currentWordMap.get(textIdx);
              if (mappedTimestampIdx !== undefined) {
                const distance = Math.abs(mappedTimestampIdx - targetTimestampIndex);
                if (distance < minDistance) {
                  minDistance = distance;
                  highlightedIndex = textIdx;
                }
              }
            }
          }
        }
      } else if (audio.duration > 0) {
        // Fallback to simple progress-based highlighting if no timestamps available
        const progress = current / audio.duration;
        highlightedIndex = Math.floor(progress * currentWords.length);
      }

      // Only update state if index changed to prevent unnecessary re-renders
      if (highlightedIndex !== lastHighlightedIndexRef.current) {
        lastHighlightedIndexRef.current = highlightedIndex;
        setHighlightedIndex(highlightedIndex);
        
        // Call onHighlightedWord callback if provided
        if (onHighlightedWord && highlightedIndex >= 0 && highlightedIndex < words.length) {
          onHighlightedWord(words[highlightedIndex], highlightedIndex);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Set initial playback rate when metadata is loaded
      // The playbackRate will be kept in sync by the separate useEffect
      if (audio.readyState >= 2) {
        audio.playbackRate = playbackRate;
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasCompleted(true); // Mark as completed to prevent replay
      setCurrentTime(audio.duration); // Keep at end, don't reset
      setHighlightedIndex(wordsRefForHighlight.current.length - 1); // Keep last word highlighted
      if (onPlayingChange) {
        onPlayingChange(false);
      }
      if (onComplete) {
        onComplete();
      }
    };

    // Prevent looping
    audio.loop = false;

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    // Auto-play when audioUrl changes or component mounts (for each new section)
    // Note: Browser autoplay policy may block this - user interaction required
    // Don't auto-play if audio has already completed or if user has manually paused
    if (autoPlay && audioUrl && !hasPlayed && !hasCompleted) {
      const playAudio = () => {
        // Reset current time to start only if audio hasn't been played yet
        if (!hasPlayed) {
          audio.currentTime = 0;
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setHasPlayed(true);
              if (onPlayingChange) {
                onPlayingChange(true);
              }
              console.log('✅ Audio started automatically');
            })
            .catch((error) => {
              // Autoplay was prevented - this is normal browser behavior
              // User will need to click play button - don't show error
              if (error.name !== 'NotAllowedError') {
                console.error("Error playing audio:", error);
              } else {
                console.log('ℹ️ Autoplay blocked by browser - user interaction required');
              }
              setIsPlaying(false);
              setHasPlayed(false); // Allow manual play
            });
        }
      };

      // Try to play immediately if audio is ready
      if (audio.readyState >= 2) {
        // Small delay to ensure audio is fully ready
        const timeoutId = setTimeout(() => {
          playAudio();
        }, 100);
        
        return () => {
          clearTimeout(timeoutId);
        };
      } else {
        // Wait for audio to be ready
        const canPlayHandler = () => {
          playAudio();
        };
        const loadedDataHandler = () => {
          playAudio();
        };
        
        audio.addEventListener("canplay", canPlayHandler, { once: true });
        audio.addEventListener("loadeddata", loadedDataHandler, { once: true });
        
        return () => {
          audio.removeEventListener("canplay", canPlayHandler);
          audio.removeEventListener("loadeddata", loadedDataHandler);
        };
      }
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, autoPlay, hasPlayed, hasCompleted, onTimeUpdate, onComplete]); // Added hasCompleted to dependencies

  // Set initial playback rate from localStorage when audio loads
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      // Restore saved playback rate when audio is ready
      const savedRate = typeof window !== 'undefined' ? localStorage.getItem('audioPlaybackRate') : null;
      if (savedRate) {
        const rate = parseFloat(savedRate);
        if (!isNaN(rate) && rate > 0) {
          audio.playbackRate = rate;
          setPlaybackRate(rate); // Sync state with actual audio playbackRate
        }
      } else {
        // If no saved rate, ensure audio starts at 1.0
        audio.playbackRate = 1;
        setPlaybackRate(1);
      }
    }
  }, [audioUrl]);

  // Update playback rate when it changes - this should NOT restart the audio
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 2) { // Only update if audio is loaded
      // Update playback rate
      audio.playbackRate = playbackRate;
      
      // If audio was playing, ensure it continues playing (don't restart)
      // The playbackRate change should not affect the playing state
      // We don't need to do anything else - the audio should continue playing
    }
  }, [playbackRate]);

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false);
      }
    };

    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedMenu]);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    // Save to localStorage for persistence across sections
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioPlaybackRate', speed.toString());
    }
    setShowSpeedMenu(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Pause audio - keep current position
      audio.pause();
      setIsPlaying(false);
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    } else {
      // Resume or start playing
      // If audio has completed, don't restart - let onComplete handle navigation
      if (hasCompleted) {
        // Audio has completed, don't replay - let parent handle navigation
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      // Resume from current position (don't reset to 0)
      audio.play().then(() => {
        setIsPlaying(true);
        setHasPlayed(true); // Mark as played to prevent auto-play
        if (onPlayingChange) {
          onPlayingChange(true);
        }
      }).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Update highlighting immediately when seeking
    if (wordTimestamps.length > 0 && wordMap.size > 0) {
      let highlightedWordIndex = -1;
      for (let i = 0; i < words.length; i++) {
        const timestampIndex = wordMap.get(i);
        if (timestampIndex !== undefined && timestampIndex < wordTimestamps.length) {
          const wordTimestamp = wordTimestamps[timestampIndex];
          // Use EXACT timestamps from JSON file
          if (newTime >= wordTimestamp.start && newTime < wordTimestamp.end) {
            highlightedWordIndex = i;
            break;
          }
        }
      }
      setHighlightedIndex(highlightedWordIndex);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle audio loading errors
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return

    const audio = audioRef.current

    const handleError = (e: Event) => {
      const errorDetails = {
        error: audio.error,
        code: audio.error?.code,
        message: audio.error?.message,
        src: audioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState,
      }
      
      console.error('Audio loading error:', errorDetails)
      
      if (audio.error) {
        switch (audio.error.code) {
          case audio.error.MEDIA_ERR_ABORTED:
            console.error('Audio loading aborted')
            break
          case audio.error.MEDIA_ERR_NETWORK:
            console.error('Network error while loading audio. File may not exist on server.')
            // Check if it's a 404
            if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
              console.warn('⚠️ Audio file not found (404). This may happen on deployed servers if files are not persisted. Consider using cloud storage.')
            }
            break
          case audio.error.MEDIA_ERR_DECODE:
            console.error('Audio decoding error - file may be corrupted')
            break
          case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            console.error('Audio format not supported or file not found (404)')
            console.warn('⚠️ Audio file not found. On deployed servers, files in public/ may not persist. Consider using cloud storage (S3, Cloudinary, etc.)')
            break
        }
      }
    }

    const handleCanPlay = () => {
      console.log('✅ Audio loaded successfully:', audioUrl)
    }

    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [audioUrl])

  return (
    <div className="w-full">
      {audioUrl ? (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata" 
          loop={false}
          onError={(e) => {
            console.error('Audio element error:', e)
          }}
        />
      ) : (
        <div className="text-yellow-400 text-sm mb-2">
          ⚠️ No audio URL provided
        </div>
      )}
      
      {/* Text with highlighting - structured display with numbered items on separate lines */}
      {!hideText && (
      <div className="text-white text-base md:text-lg leading-relaxed mb-4 min-h-[120px]">
        {textBlocks.map((block, blockIndex) => {
          // Split this block's text into words with spaces for highlighting
          const blockWordsWithSpaces = block.text.split(/(\s+)/);
          let blockWordIndex = block.wordStartIndex;
          
          return (
            <div
              key={blockIndex}
              className={block.isNumberedItem ? "mt-3 mb-2" : blockIndex === 0 ? "" : "mt-2"}
              style={{
                marginLeft: block.isNumberedItem ? "1rem" : "0",
              }}
            >
              {blockWordsWithSpaces.map((segment, segmentIndex) => {
                // Find the global word index for this segment
                const isWord = segment.trim().length > 0 && !/^\s+$/.test(segment);
                const globalWordIndex = isWord ? blockWordIndex : null;
                
                if (isWord) {
                  blockWordIndex++;
                }
                
                const isHighlighted = isWord && globalWordIndex !== null && globalWordIndex === highlightedIndex;
                const isSpace = !isWord;
                
                // Check if this segment starts with a numbered list item (e.g., "1.", "2.", "3.")
                const trimmedSegment = segment.trim();
                const isNumberedItem = /^\d+\./.test(trimmedSegment);
                
                return (
                  <span
                    key={`${blockIndex}-${segmentIndex}`}
                    ref={(el) => {
                      if (el && isWord && globalWordIndex !== null) {
                        wordsRef.current[globalWordIndex] = el;
                      }
                    }}
                    className={isSpace ? "inline" : "inline-block"}
                    style={{
                      // CRITICAL: All words must have identical base styles to prevent layout shifts
                      padding: "0",
                      margin: "0",
                      display: isSpace ? "inline" : "inline-block",
                      minWidth: "0",
                      width: "auto",
                      verticalAlign: "baseline",
                      lineHeight: "inherit",
                      fontSize: "inherit",
                      fontFamily: "inherit",
                      // IMPORTANT: Use consistent font-weight (600) for ALL words to prevent width changes
                      // This ensures highlighted and non-highlighted words have the same width
                      fontWeight: "600", // Always 600 for all words to prevent width changes
                      // Apply highlight styles without affecting layout
                      ...(isHighlighted ? {
                        background: "linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)",
                        backgroundSize: "100% 85%",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        color: "#fef08a",
                        borderRadius: "3px",
                        textShadow: "0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)",
                      } : highlightQuery && segment.toLowerCase().includes(highlightQuery.toLowerCase()) ? {
                        // Search highlight (yellow background)
                        backgroundColor: "rgba(250, 204, 21, 0.4)",
                        color: "#fef08a",
                        borderRadius: "3px",
                        fontWeight: "600",
                      } : {
                        color: isNumberedItem ? "#93c5fd" : "inherit",
                        background: "transparent",
                      }),
                      // Smooth transition for color/background only (not size-affecting properties)
                      transition: "background 0.15s ease, color 0.15s ease, text-shadow 0.15s ease",
                    }}
                  >
                    {segment}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      )}

      {/* Audio Controls */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="text-sm text-gray-300 min-w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Speed Control */}
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 min-w-[60px]"
            aria-label="Playback speed"
          >
            {playbackRate}x
          </button>
          
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-[#1e3a5f] border border-blue-500/30 rounded-lg shadow-2xl overflow-hidden z-50 min-w-[100px]">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                    playbackRate === speed
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-blue-500/30 hover:text-white'
                  }`}
                >
                  {speed}x {speed === 1 && '(Normal)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
