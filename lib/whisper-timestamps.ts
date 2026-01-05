/**
 * Utility functions for generating timestamps using Whisper (Python)
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

    // Check if whisper-timestamped is installed
    try {
      await execAsync('python -c "import whisper_timestamped"')
      return { pythonAvailable: true, whisperAvailable: true }
    } catch {
      return {
        pythonAvailable: true,
        whisperAvailable: false,
        error: 'whisper-timestamped is not installed. Run: pip install -U whisper-timestamped',
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
 * Generate timestamps from audio file using Whisper
 * 
 * @param audioPath - Full path to the audio file
 * @param outputPath - Full path where the JSON file should be saved
 * @param modelName - Whisper model name (tiny, base, small, medium, large). Default: "base"
 * @param language - Language code (en, es, fr, etc.). Default: "en"
 * @returns Promise that resolves to the timestamp data
 */
export async function generateTimestampsWithWhisper(
  audioPath: string,
  outputPath: string,
  modelName: string = 'base',
  language: string = 'en'
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

  // Build command
  const command = `${pythonCmd} "${scriptPath}" "${audioPath}" "${outputPath}" "${modelName}" "${language}"`

  console.log(`🔄 Running Whisper transcription: ${command}`)

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      timeout: 600000, // 10 minute timeout (Whisper can be slow)
    })

    // Log stderr (Whisper outputs progress to stderr)
    if (stderr) {
      console.log('Whisper output:', stderr)
    }

    // Try to parse JSON from stdout
    try {
      const result = JSON.parse(stdout.trim().split('\n').pop() || '{}')
      if (result.success) {
        console.log(`✅ Whisper timestamps generated: ${outputPath}`)
        return result
      }
    } catch {
      // If no JSON in stdout, that's okay - the file was still created
    }

    // Verify the output file was created
    if (existsSync(outputPath)) {
      console.log(`✅ Whisper timestamps file created: ${outputPath}`)
      return { success: true, output_path: outputPath }
    } else {
      throw new Error('Timestamp file was not created')
    }
  } catch (error: any) {
    console.error('❌ Whisper transcription error:', error.message)
    if (error.stderr) {
      console.error('Whisper stderr:', error.stderr)
    }
    throw new Error(`Whisper transcription failed: ${error.message}`)
  }
}

/**
 * Convert Whisper output format to our timestamp format
 * Whisper returns: { segments: [{ words: [{ text, start, end }] }] }
 * We need: { text, segments: [{ words: [{ text, start, end, confidence }] }] }
 */
export function convertWhisperToOurFormat(whisperData: any, originalText: string): any {
  const words: Array<{ text: string; start: number; end: number; confidence: number }> = []

  if (whisperData.segments && Array.isArray(whisperData.segments)) {
    for (const segment of whisperData.segments) {
      if (segment.words && Array.isArray(segment.words)) {
        for (const word of segment.words) {
          words.push({
            text: word.text || '',
            start: word.start || 0,
            end: word.end || 0,
            confidence: word.confidence || 1.0,
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

