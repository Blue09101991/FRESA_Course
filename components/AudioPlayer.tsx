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
}

export default function AudioPlayer({
  text,
  audioUrl,
  timestampsUrl,
  autoPlay = false,
  onComplete,
  onTimeUpdate,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);
  const [wordMap, setWordMap] = useState<Map<number, number>>(new Map());
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
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

  // Reset hasPlayed when audioUrl changes (new section loaded)
  useEffect(() => {
    if (audioUrl) {
      setHasPlayed(false);
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
          // Extract all words from segments
          const allWords: WordTimestamp[] = [];
          data.segments.forEach((segment) => {
            allWords.push(...segment.words);
          });
          setWordTimestamps(allWords);

          // Create a map from text word index to timestamp word index
          // This handles slight differences in text (e.g., "Nister" vs "Mr")
          const map = new Map<number, number>();
          let timestampIndex = 0;
          
          // Improved word matching algorithm for better accuracy
          const normalizeWord = (word: string) => 
            word.replace(/[.,!?;:'"]/g, '').toLowerCase().trim();
          
          // Helper to check if two words match (handles compound words and variations)
          const wordsMatch = (textWord: string, timestampWord: string): boolean => {
            const textNorm = normalizeWord(textWord);
            const timestampNorm = normalizeWord(timestampWord);
            
            // Exact match
            if (textNorm === timestampNorm) return true;
            
            // Remove all punctuation and compare
            const textClean = textNorm.replace(/[^a-z0-9]/g, '');
            const timestampClean = timestampNorm.replace(/[^a-z0-9]/g, '');
            if (textClean === timestampClean && textClean.length > 0) return true;
            
            // Handle variations like "pre-license" vs "pre-licensed" (with/without 'd')
            // Check if one is a prefix of the other (for word variations)
            if (textClean.length > 3 && timestampClean.length > 3) {
              const minLen = Math.min(textClean.length, timestampClean.length);
              const textPrefix = textClean.substring(0, minLen);
              const timestampPrefix = timestampClean.substring(0, minLen);
              if (textPrefix === timestampPrefix && Math.abs(textClean.length - timestampClean.length) <= 2) {
                return true; // Very similar words (like "license" vs "licensed")
              }
            }
            
            // Handle compound words: "homeownership" matches "home ownership"
            // Check if text word contains timestamp word or vice versa
            if (textClean.length > 5 && timestampClean.length > 3) {
              if (textClean.includes(timestampClean) || timestampClean.includes(textClean)) {
                return true;
              }
            }
            
            // Handle common word variations (e.g., "license" vs "licensed")
            const commonSuffixes = ['ed', 'ing', 's', 'es'];
            for (const suffix of commonSuffixes) {
              if (textClean + suffix === timestampClean || timestampClean + suffix === textClean) {
                return true;
              }
            }
            
            return false;
          };
          
          // Create a more flexible matching algorithm with better sequential matching
          // Use a more lenient approach: try to match sequentially first, then search
          for (let i = 0; i < words.length; i++) {
            const word = words[i].trim();
            if (!word) continue; // Skip whitespace
            
            const normalizedWord = normalizeWord(word);
            let matched = false;
            
            // Try to find matching timestamp word
            if (timestampIndex < allWords.length) {
              const timestampWord = normalizeWord(allWords[timestampIndex].text);
              
              // Exact match - prioritize this
              if (wordsMatch(word, allWords[timestampIndex].text)) {
                map.set(i, timestampIndex);
                timestampIndex++;
                matched = true;
                continue;
              }
              
              // If exact match fails, try next timestamp word (might be punctuation or spacing issue)
              if (timestampIndex + 1 < allWords.length) {
                const nextTimestampWord = normalizeWord(allWords[timestampIndex + 1].text);
                if (wordsMatch(word, allWords[timestampIndex + 1].text)) {
                  map.set(i, timestampIndex + 1);
                  timestampIndex += 2;
                  matched = true;
                  continue;
                }
              }
              
              // Handle compound words: check if current word matches combined next timestamp words
              // e.g., "homeownership" (text) matches "home" + "ownership" (timestamps)
              if (timestampIndex + 1 < allWords.length) {
                const nextTimestampWord = normalizeWord(allWords[timestampIndex + 1].text);
                const timestamp1Clean = timestampWord.replace(/[^a-z0-9]/g, '').toLowerCase();
                const timestamp2Clean = nextTimestampWord.replace(/[^a-z0-9]/g, '').toLowerCase();
                const combined = timestamp1Clean + timestamp2Clean;
                const wordClean = normalizedWord.replace(/[^a-z0-9]/g, '').toLowerCase();
                
                // Check if compound word matches (text has compound, timestamp has split)
                if (combined === wordClean) {
                  // Map to first word, skip the second timestamp word
                  map.set(i, timestampIndex);
                  timestampIndex += 2; // Skip both "home" and "ownership"
                  continue;
                }
                
                // Also check reverse: if text word contains both timestamp words
                if (wordClean.length >= combined.length - 2 && 
                    wordClean.includes(timestamp1Clean) && 
                    wordClean.includes(timestamp2Clean) &&
                    wordClean.length <= combined.length + 2) {
                  map.set(i, timestampIndex);
                  timestampIndex += 2;
                  continue;
                }
              }
              
              // Handle reverse: check if current + next text words match single timestamp word
              // e.g., "home ownership" (text) matches "homeownership" (timestamp) - less common
              if (i + 1 < words.length && timestampIndex < allWords.length) {
                const nextTextWord = normalizeWord(words[i + 1]);
                const combinedText = (normalizedWord.replace(/[^a-z0-9]/g, '') + nextTextWord.replace(/[^a-z0-9]/g, '')).toLowerCase();
                const timestampClean = timestampWord.replace(/[^a-z0-9]/g, '').toLowerCase();
                
                if (combinedText === timestampClean && combinedText.length > 5) {
                  // Both text words map to this single timestamp word
                  map.set(i, timestampIndex);
                  // Next iteration will handle the second text word
                  timestampIndex++;
                  continue;
                }
              }
              
              // Try to find the word in nearby timestamps (expanded search range)
              let found = false;
              const searchRange = 8; // Increased search range for better matching
              for (let j = Math.max(0, timestampIndex - 2); 
                   j < Math.min(allWords.length, timestampIndex + searchRange); 
                   j++) {
                if (wordsMatch(word, allWords[j].text)) {
                  map.set(i, j);
                  timestampIndex = j + 1;
                  found = true;
                  break;
                }
              }
              
              if (!found) {
                // If no match found, try to advance timestamp index but keep word mapping
                // This handles cases where timestamp has words not in text
                if (timestampIndex < allWords.length - 1) {
                  // Check if next timestamp word matches better
                  const nextWord = timestampIndex + 1 < allWords.length ? 
                    normalizeWord(allWords[timestampIndex + 1].text) : '';
                  if (wordsMatch(word, allWords[timestampIndex + 1]?.text || '')) {
                    map.set(i, timestampIndex + 1);
                    timestampIndex += 2;
                    continue;
                  }
                }
                // Fallback: map to current timestamp index
                map.set(i, timestampIndex);
                timestampIndex++;
              }
            } else {
              // If we've run out of timestamps, map to the last one
              map.set(i, allWords.length - 1);
            }
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
        // Professional word highlighting algorithm
        // Strategy: Follow EXACT timestamps from JSON file - no offsets, no early endings
        // Highlight word when its start time is reached, move to next when end time is reached
        
        let activeWordIndex = -1;
        let nextWordIndex = -1;
        let nextWordStart = Infinity;
        
        // First pass: Find word that should be highlighted based on EXACT timestamps
        for (let i = 0; i < currentWords.length; i++) {
          const timestampIndex = currentWordMap.get(i);
          if (timestampIndex !== undefined && timestampIndex < currentWordTimestamps.length) {
            const wordTimestamp = currentWordTimestamps[timestampIndex];
            
            // Use EXACT start and end times from timestamps JSON file
            // Highlight if current time is >= word start AND < word end
            if (current >= wordTimestamp.start && current < wordTimestamp.end) {
              activeWordIndex = i;
              break; // Found active word - use exact timestamps
            }
            
            // Track the next word that's about to start (for smooth anticipation)
            if (wordTimestamp.start > current && wordTimestamp.start < nextWordStart) {
              nextWordStart = wordTimestamp.start;
              nextWordIndex = i;
            }
          }
        }
        
        // If we found an active word, use it (following exact timestamps)
        if (activeWordIndex >= 0) {
          highlightedIndex = activeWordIndex;
        } 
        // If we're very close to the next word (within 0.2s), highlight it slightly early for smooth transition
        else if (nextWordIndex >= 0 && (nextWordStart - current) < 0.2) {
          highlightedIndex = nextWordIndex;
        }
        // Fallback: Find the word we're closest to based on exact timestamps
        else {
          let closestIndex = -1;
          let minDistance = Infinity;
          
          for (let i = 0; i < currentWords.length; i++) {
            const timestampIndex = currentWordMap.get(i);
            if (timestampIndex !== undefined && timestampIndex < currentWordTimestamps.length) {
              const wordTimestamp = currentWordTimestamps[timestampIndex];
              
              // Use EXACT timestamps - check if we're within the word's time range
              if (current >= wordTimestamp.start && current < wordTimestamp.end) {
                highlightedIndex = i;
                break; // Found word using exact timestamps
              }
              
              // Calculate distance to word's start time (for fallback)
              const distanceToStart = Math.abs(current - wordTimestamp.start);
              if (distanceToStart < minDistance) {
                minDistance = distanceToStart;
                closestIndex = i;
              }
            }
          }
          
          // Use closest word as fallback
          if (highlightedIndex === -1 && closestIndex >= 0) {
            highlightedIndex = closestIndex;
          }
        }
      } else if (audio.duration > 0) {
        // Fallback to simple progress-based highlighting
        const progress = current / audio.duration;
        highlightedIndex = Math.floor(progress * currentWords.length);
      }

      // Only update state if index changed to prevent unnecessary re-renders
      if (highlightedIndex !== lastHighlightedIndexRef.current) {
        lastHighlightedIndexRef.current = highlightedIndex;
        setHighlightedIndex(highlightedIndex);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Set playback rate when metadata is loaded
      audio.playbackRate = playbackRate;
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration); // Keep at end, don't reset
      setHighlightedIndex(wordsRefForHighlight.current.length - 1); // Keep last word highlighted
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
    if (autoPlay && audioUrl) {
      const playAudio = () => {
        // Reset current time to start
        audio.currentTime = 0;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setHasPlayed(true);
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
  }, [audioUrl, autoPlay, hasPlayed, onTimeUpdate, onComplete, playbackRate]); // Minimal dependencies

  // Update playback rate when it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
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
    setShowSpeedMenu(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
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
      console.error('Audio loading error:', {
        error: audio.error,
        code: audio.error?.code,
        message: audio.error?.message,
        src: audioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState,
      })
      
      if (audio.error) {
        switch (audio.error.code) {
          case audio.error.MEDIA_ERR_ABORTED:
            console.error('Audio loading aborted')
            break
          case audio.error.MEDIA_ERR_NETWORK:
            console.error('Network error while loading audio')
            break
          case audio.error.MEDIA_ERR_DECODE:
            console.error('Audio decoding error - file may be corrupted')
            break
          case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            console.error('Audio format not supported or file not found')
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
