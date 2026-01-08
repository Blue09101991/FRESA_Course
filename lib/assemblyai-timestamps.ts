/**
 * Utility functions for generating timestamps using AssemblyAI API
 * This provides accurate word-level timestamps from audio files
 */

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com'

/**
 * Upload audio file to AssemblyAI
 */
async function uploadAudioFile(audioPath: string): Promise<string> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in environment variables')
  }

  const fs = await import('fs/promises')
  const audioBuffer = await fs.readFile(audioPath)

  const uploadResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/upload`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
    },
    body: audioBuffer,
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Failed to upload audio to AssemblyAI: ${uploadResponse.status} ${errorText}`)
  }

  const uploadData = await uploadResponse.json()
  return uploadData.upload_url
}

/**
 * Submit audio for transcription with word-level timestamps
 */
async function submitTranscription(audioUrl: string): Promise<string> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in environment variables')
  }

  // AssemblyAI API expects the request body with specific format
  // Only include essential parameters to avoid schema errors
  const requestBody: any = {
    audio_url: audioUrl,
  }
  
  // Enable word-level timestamps (required for accurate highlighting)
  requestBody.word_timestamps = true

  console.log('📤 Submitting transcription with body:', JSON.stringify(requestBody, null, 2))

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/transcript`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ AssemblyAI API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      requestBody: requestBody,
    })
    throw new Error(`Failed to submit transcription: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  if (!data.id) {
    throw new Error(`Invalid response from AssemblyAI: ${JSON.stringify(data)}`)
  }
  return data.id
}

/**
 * Poll for transcription completion
 */
async function pollTranscription(transcriptId: string): Promise<any> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in environment variables')
  }

  const pollingEndpoint = `${ASSEMBLYAI_BASE_URL}/v2/transcript/${transcriptId}`
  const maxAttempts = 120 // 10 minutes max (5 second intervals)
  let attempts = 0

  while (attempts < maxAttempts) {
    const response = await fetch(pollingEndpoint, {
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to poll transcription: ${response.status} ${errorText}`)
    }

    const transcript = await response.json()

    if (transcript.status === 'completed') {
      return transcript
    } else if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`)
    }

    // Wait 5 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++
  }

  throw new Error('Transcription timeout: exceeded maximum polling attempts')
}

/**
 * Get word-level timestamps from completed transcript
 * AssemblyAI includes words in the transcript response when word_timestamps is enabled
 */
async function getWordTimestamps(transcriptId: string, transcript: any): Promise<any[]> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in environment variables')
  }

  // AssemblyAI includes words in the transcript response when word_timestamps is enabled
  if (transcript.words && Array.isArray(transcript.words) && transcript.words.length > 0) {
    console.log(`✅ Found ${transcript.words.length} words in transcript response`)
    return transcript.words
  }

  // Fallback: Try to get words from the words endpoint (if it exists)
  try {
    const wordsEndpoint = `${ASSEMBLYAI_BASE_URL}/v2/transcript/${transcriptId}/words`
    const response = await fetch(wordsEndpoint, {
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
      },
    })

    if (response.ok) {
      const wordsData = await response.json()
      if (wordsData.words && Array.isArray(wordsData.words)) {
        return wordsData.words
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch words from words endpoint, using transcript response')
  }

  // If no words found, return empty array
  console.warn('⚠️ No words found in transcript response')
  return []
}

/**
 * Convert AssemblyAI word format to our timestamp format
 * AssemblyAI returns: [{ text, start (ms), end (ms), confidence }]
 * We need: { text, segments: [{ words: [{ text, start (s), end (s), confidence }] }] }
 */
export function convertAssemblyAIToOurFormat(
  assemblyAIWords: any[],
  originalText: string
): any {
  const words = assemblyAIWords.map((word) => ({
    text: word.text || '',
    // Convert milliseconds to seconds
    start: (word.start || 0) / 1000,
    end: (word.end || 0) / 1000,
    confidence: word.confidence || 1.0,
  }))

  return {
    text: originalText.trim(),
    segments: [
      {
        words: words,
      },
    ],
  }
}

/**
 * Generate timestamps from audio file using AssemblyAI
 * 
 * @param audioPath - Full path to the audio file
 * @param originalText - The original text that was used to generate the audio
 * @returns Promise that resolves to the timestamp data in our format
 */
export async function generateTimestampsWithAssemblyAI(
  audioPath: string,
  originalText: string
): Promise<any> {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error(
      'ASSEMBLYAI_API_KEY is not configured. Please set ASSEMBLYAI_API_KEY in your .env file.'
    )
  }

  // Verify API key format (should start with a valid prefix)
  if (ASSEMBLYAI_API_KEY.length < 20) {
    console.warn('⚠️ AssemblyAI API key seems too short. Please verify it is correct.')
  }

  try {
    console.log('🔄 Uploading audio to AssemblyAI...')
    console.log(`📁 Audio path: ${audioPath}`)
    const audioUrl = await uploadAudioFile(audioPath)
    console.log(`✅ Audio uploaded successfully: ${audioUrl.substring(0, 50)}...`)

    console.log('🔄 Submitting transcription request...')
    const transcriptId = await submitTranscription(audioUrl)
    console.log(`✅ Transcription submitted: ${transcriptId}`)

    console.log('🔄 Waiting for transcription to complete...')
    const transcript = await pollTranscription(transcriptId)
    console.log('✅ Transcription completed')

    console.log('🔄 Fetching word-level timestamps...')
    const words = await getWordTimestamps(transcriptId, transcript)
    console.log(`✅ Retrieved ${words.length} word timestamps`)
    
    if (words.length === 0) {
      throw new Error('No word timestamps found in transcript. Make sure word_timestamps is enabled.')
    }

    // Convert to our format
    const timestampsData = convertAssemblyAIToOurFormat(words, originalText)

    return timestampsData
  } catch (error: any) {
    console.error('❌ AssemblyAI timestamp generation error:', error.message)
    console.error('❌ Full error:', error)
    
    // Provide more helpful error messages
    if (error.message.includes('400')) {
      throw new Error(
        `AssemblyAI API request format error. Please check:\n` +
        `1. API key is correct and valid\n` +
        `2. API key has proper permissions\n` +
        `3. Request format matches AssemblyAI API documentation\n` +
        `Original error: ${error.message}`
      )
    }
    
    throw new Error(`AssemblyAI transcription failed: ${error.message}`)
  }
}

/**
 * Check if AssemblyAI API key is configured
 */
export function checkAssemblyAIConfiguration(): {
  configured: boolean
  error?: string
} {
  if (!ASSEMBLYAI_API_KEY) {
    return {
      configured: false,
      error: 'ASSEMBLYAI_API_KEY is not configured in environment variables',
    }
  }

  return {
    configured: true,
  }
}

