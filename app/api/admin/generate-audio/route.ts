import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, canEdit } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb' // Voice ID for introduction and chapter sections (default fallback)
const ELEVENLABS_QUIZ_VOICE_ID = 'GP1bgf0sjoFuuHkyrg8E' // Woman's voice ID for quiz questions

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key is not configured. Please set ELEVENLABS_API_KEY in your .env file and restart the server.' },
        { status: 500 }
      )
    }

    if (!ELEVENLABS_VOICE_ID) {
      return NextResponse.json(
        { error: 'ElevenLabs Voice ID is not configured. Please set ELEVENLABS_VOICE_ID in your .env file and restart the server.' },
        { status: 500 }
      )
    }

    const { text, type, voiceId } = await request.json() // type: 'audio' or 'timestamps' or 'both', voiceId: optional voice ID override

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Use provided voiceId, or default to quiz voice if not specified, or fallback to default voice
    const selectedVoiceId = voiceId || ELEVENLABS_QUIZ_VOICE_ID || ELEVENLABS_VOICE_ID

    // Generate audio using ElevenLabs TTS API
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
          'User-Agent': 'E-Course-App/1.0',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2', // Use multilingual v2 for best quality
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    // Check content type
    const contentType = audioResponse.headers.get('content-type')
    console.log('ElevenLabs response:', {
      status: audioResponse.status,
      statusText: audioResponse.statusText,
      contentType: contentType,
      contentLength: audioResponse.headers.get('content-length'),
    })

    if (!audioResponse.ok) {
      const errorData = await audioResponse.text()
      console.error('ElevenLabs API error:', errorData)
      
      // Check if it's a Cloudflare challenge page
      if (errorData.includes('Just a moment') || errorData.includes('cf-challenge')) {
        return NextResponse.json(
          { 
            error: 'ElevenLabs API is blocked by Cloudflare. Please check your API key is valid and correctly set in .env file as ELEVENLABS_API_KEY. The API key should start with "xi-".' 
          },
          { status: 403 }
        )
      }
      
      // Try to parse JSON error if available
      let errorMessage = `Failed to generate audio: ${audioResponse.statusText}`
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.detail?.message) {
          errorMessage = errorJson.detail.message
        } else if (errorJson.message) {
          errorMessage = errorJson.message
        }
      } catch {
        // Not JSON, use default message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: audioResponse.status }
      )
    }

    // Get audio as buffer
    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBytes = Buffer.from(audioBuffer)

    // Validate audio file (MP3 files start with specific bytes)
    if (audioBytes.length === 0) {
      return NextResponse.json(
        { error: 'Generated audio file is empty' },
        { status: 500 }
      )
    }

    // Check if it's a valid MP3 file (starts with ID3 tag or MPEG frame sync)
    const isValidMP3 = audioBytes[0] === 0xFF && (audioBytes[1] & 0xE0) === 0xE0 || // MPEG frame sync
                       audioBytes[0] === 0x49 && audioBytes[1] === 0x44 && audioBytes[2] === 0x33 // ID3 tag
    
    if (!isValidMP3 && audioBytes.length > 10) {
      console.warn('Warning: Audio file may not be a valid MP3. First bytes:', audioBytes.slice(0, 10))
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedText = text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')
    const audioFileName = `${timestamp}-${sanitizedText}.mp3`

    // Determine upload directory based on type
    const uploadDir = 'public/audio'
    const uploadPath = join(process.cwd(), uploadDir)

    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true })
    }

    const audioFilePath = join(uploadPath, audioFileName)
    await writeFile(audioFilePath, audioBytes)

    // Verify file was written correctly
    const stats = await import('fs/promises').then(m => m.stat(audioFilePath))
    if (stats.size !== audioBytes.length) {
      return NextResponse.json(
        { error: 'Failed to save audio file correctly' },
        { status: 500 }
      )
    }

    // Double-check file exists and is readable
    if (!existsSync(audioFilePath)) {
      return NextResponse.json(
        { error: 'Audio file was not created successfully' },
        { status: 500 }
      )
    }

    console.log(`✅ Audio file saved: ${audioFileName} (${stats.size} bytes)`)
    console.log(`✅ File path verified: ${audioFilePath}`)
    console.log(`✅ File URL will be: /audio/${audioFileName}`)

    // In Next.js, files in public/ are served from root, so remove 'public/' from URL
    const audioUrl = `/audio/${audioFileName}`

    // Generate timestamps
    // Estimate duration: MP3 files at 128kbps are approximately 1MB per minute
    // For better accuracy, we estimate based on file size
    // Note: For production, consider using ElevenLabs Speech to Text API for accurate word-level timestamps
    const estimatedDurationSeconds = Math.max(1, (audioBytes.length / 1024 / 1024) * 60)
    
    // Split text into words (preserve spaces for display)
    const textWords = text.trim().split(/(\s+)/)
    const words = textWords.filter((w: string) => w.trim().length > 0)
    
    // Calculate average speaking rate: ~150 words per minute
    const wordsPerSecond = 150 / 60
    const estimatedDurationFromText = words.length / wordsPerSecond
    
    // Use the longer of the two estimates (file size or text-based)
    const finalDuration = Math.max(estimatedDurationSeconds, estimatedDurationFromText)
    const avgWordDuration = finalDuration / words.length

    const wordTimestamps = words.map((word: string, index: number) => {
      const start = index * avgWordDuration
      const end = (index + 1) * avgWordDuration
      return {
        text: word.trim(),
        start: Math.max(0, Math.round(start * 1000) / 1000), // Convert to seconds with 3 decimal places
        end: Math.round(end * 1000) / 1000,
        confidence: 1.0,
      }
    }).filter((w: { text: string }) => w.text.length > 0) // Filter out empty words

    const timestampsData = {
      text: text.trim(),
      segments: [
        {
          words: wordTimestamps,
        },
      ],
    }

    // Save timestamps file
    const timestampsDir = 'public/timestamps'
    const timestampsPath = join(process.cwd(), timestampsDir)

    if (!existsSync(timestampsPath)) {
      await mkdir(timestampsPath, { recursive: true })
    }

    const timestampsFileName = `${timestamp}-${sanitizedText}.timestamps.json`
    const timestampsFilePath = join(timestampsPath, timestampsFileName)
    await writeFile(timestampsFilePath, JSON.stringify(timestampsData, null, 2))

    // In Next.js, files in public/ are served from root, so remove 'public/' from URL
    const timestampsUrl = `/timestamps/${timestampsFileName}`

    return NextResponse.json({
      success: true,
      audioUrl,
      timestampsUrl,
      audioFileName,
      timestampsFileName,
    })
  } catch (error: any) {
    console.error('Error generating audio:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio', details: error.message },
      { status: 500 }
    )
  }
}

