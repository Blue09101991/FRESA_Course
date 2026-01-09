/**
 * Utility functions for generating audio and timestamps using Inworld AI TTS API
 * Inworld AI provides both audio generation and word-level timestamps in a single API call
 */

/**
 * Convert Inworld AI timestamp format to our timestamp format
 * Inworld returns: { timestampInfo: { wordAlignment: { words: string[], wordStartTimeSeconds: number[], wordEndTimeSeconds: number[] } } }
 * We need: { text, segments: [{ words: [{ text, start, end, confidence }] }] }
 */
export function convertInworldToOurFormat(
  inworldData: {
    timestampInfo?: {
      wordAlignment?: {
        words: string[]
        wordStartTimeSeconds: number[]
        wordEndTimeSeconds: number[]
      }
    }
  },
  originalText: string
): any {
  const words: Array<{ text: string; start: number; end: number; confidence: number }> = []

  if (
    inworldData.timestampInfo?.wordAlignment?.words &&
    inworldData.timestampInfo.wordAlignment.wordStartTimeSeconds &&
    inworldData.timestampInfo.wordAlignment.wordEndTimeSeconds
  ) {
    const wordArray = inworldData.timestampInfo.wordAlignment.words
    const startTimes = inworldData.timestampInfo.wordAlignment.wordStartTimeSeconds
    const endTimes = inworldData.timestampInfo.wordAlignment.wordEndTimeSeconds

    // Ensure all arrays have the same length
    const minLength = Math.min(wordArray.length, startTimes.length, endTimes.length)

    for (let i = 0; i < minLength; i++) {
      words.push({
        text: wordArray[i] || '',
        start: startTimes[i] || 0,
        end: endTimes[i] || 0,
        confidence: 1.0, // Inworld doesn't provide confidence scores, use 1.0
      })
    }
  }

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
 * Options for Inworld TTS API
 */
export interface InworldTTSOptions {
  modelId?: string; // Model ID (inworld-tts-1 or inworld-tts-1-max)
  audioEncoding?: string; // Audio encoding format (MP3, OGG_OPUS, LINEAR16, etc.)
  speakingRate?: number; // Speaking rate (0.5 to 1.5, default 1.0)
  sampleRateHertz?: number; // Sample rate in Hz (default 48000)
  bitRate?: number; // Bit rate for compressed formats (default 128000)
  temperature?: number; // Temperature (0.0 to 2.0, default 1.1)
  timestampType?: 'WORD' | 'CHARACTER' | 'TIMESTAMP_TYPE_UNSPECIFIED'; // Timestamp type
  applyTextNormalization?: 'ON' | 'OFF' | 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED'; // Text normalization
}

/**
 * Generate audio and timestamps using Inworld AI TTS API
 * 
 * @param text - Text to synthesize
 * @param voiceId - Voice ID to use
 * @param apiKey - Inworld API key (Base64 encoded credentials)
 * @param options - Optional configuration parameters
 * @returns Promise with audio buffer and timestamp data
 */
export async function generateAudioWithInworld(
  text: string,
  voiceId: string,
  apiKey: string,
  options: InworldTTSOptions = {}
): Promise<{
  audioBuffer: Buffer
  timestampData: any
}> {
  const apiUrl = 'https://api.inworld.ai/tts/v1/voice'

  // Set defaults
  const {
    modelId = 'inworld-tts-1',
    audioEncoding = 'MP3',
    speakingRate = 1.0,
    sampleRateHertz = 48000,
    bitRate,
    temperature = 1.1,
    timestampType = 'WORD',
    applyTextNormalization = 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED',
  } = options

  // Validate ranges
  const validatedTemperature = Math.max(0.0, Math.min(2.0, temperature))
  const validatedSpeakingRate = Math.max(0.5, Math.min(1.5, speakingRate))
  const validatedSampleRate = Math.max(8000, Math.min(48000, sampleRateHertz))

  const requestBody: any = {
    text: text.trim(),
    voiceId: voiceId,
    modelId: modelId,
    timestampType: timestampType,
    temperature: validatedTemperature,
    applyTextNormalization: applyTextNormalization,
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: validatedSpeakingRate,
      sampleRateHertz: validatedSampleRate,
    },
  }

  // Add bitRate only for compressed formats
  if (bitRate && (audioEncoding === 'MP3' || audioEncoding === 'OGG_OPUS')) {
    requestBody.audioConfig.bitRate = bitRate
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`, // Inworld uses Basic auth with Base64 credentials
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorData = await response.text()
    let errorMessage = `Failed to generate audio: ${response.statusText}`
    
    try {
      const errorJson = JSON.parse(errorData)
      if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Not JSON, use default message
    }
    
    throw new Error(errorMessage)
  }

  const data = await response.json()

  // Extract audio content (base64 encoded)
  if (!data.audioContent) {
    throw new Error('No audio content in response')
  }

  // Decode base64 audio
  const audioBuffer = Buffer.from(data.audioContent, 'base64')

  // Convert timestamp format
  const timestampData = convertInworldToOurFormat(data, text)

  return {
    audioBuffer,
    timestampData,
  }
}

