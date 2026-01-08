/**
 * Utility functions for generating timestamps using WhisperX (Python)
 * WhisperX provides more accurate word-level timestamps through forced alignment with wav2vec2 models
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

/**
 * Check if Python and required packages are available
 */
export async function checkWhisperDependencies(): Promise<{
  pythonAvailable: boolean
  whisperAvailable: boolean
  error?: string
}> {
  try {
    // Check if Python is available
    const { stdout: pythonVersion } = await execAsync('python --version')
    if (!pythonVersion) {
      return { pythonAvailable: false, whisperAvailable: false, error: 'Python not found' }
    }

    // Check if whisperx is installed
    try {
      await execAsync('python -c "import whisperx"')
      return { pythonAvailable: true, whisperAvailable: true }
    } catch {
      return {
        pythonAvailable: true,
        whisperAvailable: false,
        error: 'whisperx is not installed. Run: pip install -U whisperx',
      }
    }
  } catch (error: any) {
    return {
      pythonAvailable: false,
      whisperAvailable: false,
      error: error.message || 'Failed to check dependencies',
    }
  }
}

/**
 * Generate timestamps from audio file using WhisperX
 * WhisperX uses forced alignment with wav2vec2 models for more accurate word-level timestamps
 * 
 * @param audioPath - Full path to the audio file
 * @param outputPath - Full path where the JSON file should be saved
 * @param modelName - Whisper model name (tiny, base, small, medium, large, large-v2, large-v3). Default: "base"
 * @param language - Language code (en, es, fr, etc.). Default: "en"
 * @param batchSize - Batch size for transcription (reduce if low on GPU mem). Default: 16
 * @param computeType - Compute type ("float16" for GPU, "int8" for CPU/low mem). Default: "int8"
 * @param device - Device to use ("cuda" or "cpu"). Default: "cpu"
 * @returns Promise that resolves to the timestamp data
 */
export async function generateTimestampsWithWhisper(
  audioPath: string,
  outputPath: string,
  modelName: string = 'base',
  language: string = 'en',
  batchSize: number = 16,
  computeType: string = 'int8',
  device: string = 'cpu'
): Promise<any> {
  // Get the Python script path
  const scriptPath = join(process.cwd(), 'scripts', 'python', 'audio_to_timestamps.py')

  if (!existsSync(scriptPath)) {
    throw new Error(`Python script not found: ${scriptPath}`)
  }

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  // Determine Python command (try python3 first, then python)
  let pythonCmd = 'python3'
  try {
    await execAsync('python3 --version')
  } catch {
    pythonCmd = 'python'
  }

  // Build command with all parameters
  const command = `${pythonCmd} "${scriptPath}" "${audioPath}" "${outputPath}" "${modelName}" "${language}" "${batchSize}" "${computeType}" "${device}"`

  console.log(`🔄 Running WhisperX transcription with alignment: ${command}`)

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      timeout: 900000, // 15 minute timeout (WhisperX with alignment can be slower)
    })

    // Log stderr (WhisperX outputs progress to stderr)
    if (stderr) {
      console.log('WhisperX output:', stderr)
    }

    // Try to parse JSON from stdout
    try {
      const result = JSON.parse(stdout.trim().split('\n').pop() || '{}')
      if (result.success) {
        console.log(`✅ WhisperX timestamps generated: ${outputPath}`)
        return result
      }
    } catch {
      // If no JSON in stdout, that's okay - the file was still created
    }

    // Verify the output file was created
    if (existsSync(outputPath)) {
      console.log(`✅ WhisperX timestamps file created: ${outputPath}`)
      return { success: true, output_path: outputPath }
    } else {
      throw new Error('Timestamp file was not created')
    }
  } catch (error: any) {
    console.error('❌ WhisperX transcription error:', error.message)
    if (error.stderr) {
      console.error('WhisperX stderr:', error.stderr)
    }
    throw new Error(`WhisperX transcription failed: ${error.message}`)
  }
}

/**
 * Convert WhisperX output format to our timestamp format
 * WhisperX returns: { segments: [{ words: [{ text, start, end, score? }] }], language: string }
 * We need: { text, segments: [{ words: [{ text, start, end, confidence }] }] }
 * 
 * Note: WhisperX provides more accurate timestamps through forced alignment with wav2vec2
 */
export function convertWhisperToOurFormat(whisperData: any, originalText: string): any {
  const words: Array<{ text: string; start: number; end: number; confidence: number }> = []

  if (whisperData.segments && Array.isArray(whisperData.segments)) {
    for (const segment of whisperData.segments) {
      if (segment.words && Array.isArray(segment.words)) {
        for (const word of segment.words) {
          // WhisperX uses 'score' for confidence, but we use 'confidence'
          // Also handle cases where confidence might be missing
          const confidence = word.score !== undefined ? word.score : (word.confidence !== undefined ? word.confidence : 1.0)
          
          words.push({
            text: word.text || '',
            start: word.start || 0,
            end: word.end || 0,
            confidence: confidence,
          })
        }
      }
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

