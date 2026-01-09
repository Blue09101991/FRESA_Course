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
 * Generate audio and timestamps using Inworld AI TTS API
 * 
 * @param text - Text to synthesize
 * @param voiceId - Voice ID to use
 * @param modelId - Model ID (inworld-tts-1 or inworld-tts-1-max)
 * @param apiKey - Inworld API key (Base64 encoded credentials)
 * @param audioEncoding - Audio encoding format (MP3, OGG_OPUS, LINEAR16, etc.)
 * @param speakingRate - Speaking rate (0.5 to 1.5, default 1.0)
 * @param sampleRateHertz - Sample rate in Hz (default 48000)
 * @param temperature - Temperature for sampling (0.0 to 2.0, default 1.1). Higher values = more random/expressive, lower = more deterministic
 * @returns Promise with audio buffer and timestamp data
 */
export async function generateAudioWithInworld(
  text: string,
  voiceId: string,
  modelId: string = 'inworld-tts-1',
  apiKey: string,
  audioEncoding: string = 'MP3',
  speakingRate: number = 1.0,
  sampleRateHertz: number = 48000,
  temperature: number = 1.1
): Promise<{
  audioBuffer: Buffer
  timestampData: any
}> {
  const apiUrl = 'https://api.inworld.ai/tts/v1/voice'

  // Validate temperature range (0.0 to 2.0)
  const validatedTemperature = Math.max(0.0, Math.min(2.0, temperature))

  const requestBody: any = {
    text: text.trim(),
    voiceId: voiceId,
    modelId: modelId,
    timestampType: 'WORD', // Request word-level timestamps
    temperature: validatedTemperature, // Temperature for controlling randomness/expressiveness
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: speakingRate,
      sampleRateHertz: sampleRateHertz,
    },
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

