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
            if (segment.words && Array.isArray(segment.words)) {
              segment.words.forEach((word) => {
                // Clean up timestamp words - remove extra whitespace, trim
                const cleanedWord = {
                  ...word,
                  text: word.text ? word.text.trim() : '',
                };
                // Only add non-empty words
                if (cleanedWord.text.length > 0) {
                  allWords.push(cleanedWord);
                }
              });
            }
          });
          setWordTimestamps(allWords);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📝 Loaded timestamps:', {
              totalWords: allWords.length,
              firstFew: allWords.slice(0, 5).map(w => ({ text: w.text, start: w.start, end: w.end })),
              textWords: words.length,
              textPreview: words.slice(0, 5),
            });
          }

          // Create a map from text word index to timestamp word index
          // Use timestamp words as the source of truth - they represent what was actually spoken
          const map = new Map<number, number>();
          
          // Normalize word for comparison (remove punctuation, lowercase)
          const normalizeWord = (word: string): string => {
            return word.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
          };
          
          // More accurate word matching - handles punctuation differences but is stricter
          const wordsMatch = (textWord: string, timestampWord: string): boolean => {
            // Trim both words first
            const textTrimmed = textWord.trim();
            const timestampTrimmed = timestampWord.trim();
            
            // Exact match (case-insensitive)
            if (textTrimmed.toLowerCase() === timestampTrimmed.toLowerCase()) {
              return true;
            }
            
            // Normalize both words (remove punctuation, lowercase)
            const textNorm = normalizeWord(textTrimmed);
            const timestampNorm = normalizeWord(timestampTrimmed);
            
            // Exact match after normalization
            if (textNorm === timestampNorm && textNorm.length > 0) {
              return true;
            }
            
            // Remove all non-alphanumeric characters and compare
            const textClean = textNorm.replace(/[^a-z0-9]/g, '');
            const timestampClean = timestampNorm.replace(/[^a-z0-9]/g, '');
            
            // Exact match after removing all non-alphanumeric
            if (textClean === timestampClean && textClean.length > 0) {
              return true;
            }
            
            // Handle cases where punctuation differs (e.g., "word." vs "word")
            // But be more strict - only match if the core word is the same
            if (textClean.length > 0 && timestampClean.length > 0) {
              // Check if one is a prefix of the other (handles "word." vs "word")
              // But only if the shorter one is at least 3 characters (to avoid false matches)
              const minLength = Math.min(textClean.length, timestampClean.length);
              if (minLength >= 3) {
                const textPrefix = textClean.substring(0, minLength);
                const timestampPrefix = timestampClean.substring(0, minLength);
                if (textPrefix === timestampPrefix) {
                  // Core words match, only difference is length (likely punctuation)
                  // Be strict: only allow 1-2 character difference
                  if (Math.abs(textClean.length - timestampClean.length) <= 2) {
                    return true;
                  }
                }
              }
            }
            
            return false;
          };
          
          // CRITICAL: Use timestamp words as the PRIMARY source of truth
          // They represent what was ACTUALLY spoken in the audio
          // Match each timestamp word to the corresponding text word sequentially
          // Use a more conservative approach: smaller search window, stricter matching
          
          let timestampIndex = 0;
          let textIndex = 0;
          
          // More conservative sequential matching
          // Only search a small window ahead to prevent incorrect matches
          const searchWindow = 3; // Reduced from 10 to 3 for more accurate matching
          
          for (timestampIndex = 0; timestampIndex < allWords.length; timestampIndex++) {
            const timestampWord = allWords[timestampIndex].text.trim();
            if (!timestampWord) continue; // Skip empty timestamp words
            
            // Find the matching text word starting from current position
            let matched = false;
            
            // Strategy 1: Try exact match at current position (most common case)
            if (textIndex < words.length) {
              const currentTextWord = words[textIndex].trim();
              if (currentTextWord && wordsMatch(currentTextWord, timestampWord)) {
                map.set(textIndex, timestampIndex);
                textIndex++;
                matched = true;
                continue;
              }
            }
            
            // Strategy 2: Search ahead in a small window (handles minor punctuation differences)
            if (!matched) {
              for (let i = 1; i <= searchWindow && textIndex + i < words.length; i++) {
                const candidateTextWord = words[textIndex + i].trim();
                if (candidateTextWord && wordsMatch(candidateTextWord, timestampWord)) {
                  // Found a match ahead - this means there might be extra words in text
                  // Map the skipped words to the previous timestamp (or current if first)
                  for (let j = 0; j < i; j++) {
                    if (textIndex + j < words.length && words[textIndex + j].trim()) {
                      // Map skipped words to previous timestamp (or current if first)
                      const prevTimestampIdx = timestampIndex > 0 ? timestampIndex - 1 : timestampIndex;
                      map.set(textIndex + j, prevTimestampIdx);
                    }
                  }
                  // Map the matched word to current timestamp
                  map.set(textIndex + i, timestampIndex);
                  textIndex += i + 1; // Move past the matched word
                  matched = true;
                  break;
                }
              }
            }
            
            // Strategy 3: If still no match, map current text word to this timestamp (best guess)
            // This handles cases where timestamps have words not in text
            if (!matched && textIndex < words.length) {
              const currentTextWord = words[textIndex].trim();
              if (currentTextWord) {
                map.set(textIndex, timestampIndex);
                textIndex++;
              }
            }
          }
          
          // Map any remaining text words to the last timestamp
          // This ensures all text words have a mapping
          while (textIndex < words.length) {
            if (words[textIndex].trim()) {
              map.set(textIndex, allWords.length - 1);
            }
            textIndex++;
          }
          
          // Log mapping for debugging
          if (process.env.NODE_ENV === 'development') {
            // Check for potential mismatches
            const mismatches: Array<{ textIdx: number; textWord: string; tsIdx: number; tsWord: string }> = [];
            for (let i = 0; i < Math.min(20, words.length, allWords.length); i++) {
              const mappedTsIdx = map.get(i);
              if (mappedTsIdx !== undefined && mappedTsIdx < allWords.length) {
                const textWord = words[i];
                const tsWord = allWords[mappedTsIdx].text;
                const textNorm = normalizeWord(textWord);
                const tsNorm = normalizeWord(tsWord);
                if (textNorm !== tsNorm && Math.abs(i - mappedTsIdx) > 2) {
                  mismatches.push({ textIdx: i, textWord, tsIdx: mappedTsIdx, tsWord });
                }
              }
            }
            
            console.log('✅ Word mapping completed:', {
              textWords: words.length,
              timestampWords: allWords.length,
              mappedWords: map.size,
              sampleMappings: Array.from(map.entries()).slice(0, 15).map(([textIdx, tsIdx]) => ({
                textIdx,
                textWord: words[textIdx],
                timestampIdx: tsIdx,
                timestampWord: allWords[tsIdx]?.text,
                timestampStart: allWords[tsIdx]?.start,
                timestampEnd: allWords[tsIdx]?.end,
                normalizedMatch: normalizeWord(words[textIdx]) === normalizeWord(allWords[tsIdx]?.text || ''),
              })),
              firstFewTimestamps: allWords.slice(0, 10).map(ts => ({
                text: ts.text,
                start: ts.start,
                end: ts.end,
              })),
              firstFewTextWords: words.slice(0, 10),
              potentialMismatches: mismatches.slice(0, 5),
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
  const onHighlightedWordRef = useRef(onHighlightedWord);

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

  useEffect(() => {
    onHighlightedWordRef.current = onHighlightedWord;
  }, [onHighlightedWord]);

  // Throttle updates to prevent excessive re-renders
  const lastUpdateTime = useRef<number>(0);
  const updateInterval = 5; // Update every 5ms for very fast and responsive highlighting (reduced from 15ms)

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
          // Anticipate slightly (0.03s before) so highlighting appears slightly ahead of speech for better visual sync
          if (current >= wordTimestamp.start - 0.03 && current < wordTimestamp.end) {
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
        // Reduced threshold to 0.05s to allow anticipation for better visual sync
        const targetTimestampIndex = activeTimestampIndex >= 0 
          ? activeTimestampIndex 
          : (closestTimestampIndex >= 0 && closestTimestampDistance < 0.05 ? closestTimestampIndex : -1);
        
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
          
          // If no exact match, find the closest text word (but be more strict)
          if (highlightedIndex === -1) {
            let minDistance = Infinity;
            let bestTextIdx = -1;
            for (let textIdx = 0; textIdx < currentWords.length; textIdx++) {
              const mappedTimestampIdx = currentWordMap.get(textIdx);
              if (mappedTimestampIdx !== undefined) {
                const distance = Math.abs(mappedTimestampIdx - targetTimestampIndex);
                // Only use if distance is small (within 1 position for faster, more accurate matching)
                if (distance < minDistance && distance <= 1) {
                  minDistance = distance;
                  bestTextIdx = textIdx;
                }
              }
            }
            if (bestTextIdx >= 0) {
              highlightedIndex = bestTextIdx;
            }
          }
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development' && highlightedIndex >= 0) {
            const timestampWord = currentWordTimestamps[targetTimestampIndex]?.text;
            const textWord = currentWords[highlightedIndex];
            const mappedTsIdx = currentWordMap.get(highlightedIndex);
            if (mappedTsIdx !== targetTimestampIndex) {
              // Log mismatches for debugging
              console.log('⚠️ Highlight mismatch:', {
                currentTime: current.toFixed(3),
                targetTimestampIdx: targetTimestampIndex,
                timestampWord,
                highlightedTextIdx: highlightedIndex,
                textWord,
                mappedTimestampIdx: mappedTsIdx,
              });
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
        
        // Call onHighlightedWord callback if provided (use ref to get latest callback)
        const currentCallback = onHighlightedWordRef.current;
        const currentWords = wordsRefForHighlight.current;
        
        if (currentCallback && highlightedIndex >= 0 && highlightedIndex < currentWords.length) {
          const word = currentWords[highlightedIndex];
          // Always log in development to debug
          console.log('📢 AudioPlayer calling onHighlightedWord:', { 
            word, 
            highlightedIndex, 
            wordsLength: currentWords.length,
            hasCallback: !!currentCallback,
            currentTime: current.toFixed(3),
          });
          try {
            currentCallback(word, highlightedIndex);
          } catch (error) {
            console.error('❌ Error in onHighlightedWord callback:', error);
          }
        } else if (currentCallback) {
          // Log why callback wasn't called (always log, not just in dev)
          console.warn('⚠️ onHighlightedWord not called:', {
            hasCallback: !!currentCallback,
            highlightedIndex,
            wordsLength: currentWords.length,
            condition: highlightedIndex >= 0 && highlightedIndex < currentWords.length,
            currentTime: current.toFixed(3),
          });
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
      setHighlightedIndex(-1); // Clear highlight when audio ends
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
  }, [audioUrl, autoPlay, hasPlayed, hasCompleted, onTimeUpdate, onComplete, onHighlightedWord, words]); // Added onHighlightedWord and words to dependencies

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
