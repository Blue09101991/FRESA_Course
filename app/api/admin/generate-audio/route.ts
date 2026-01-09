import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, canEdit } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { generateAudioWithInworld } from '@/lib/inworld-tts'

// Inworld AI API Configuration
// Inworld uses Basic authentication with Base64 encoded credentials
// Format: Base64(workspace_id:api_key)
const INWORLD_API_KEY = process.env.INWORLD_API_KEY // Base64 encoded credentials (workspace_id:api_key)
const INWORLD_MAN_VOICE_ID = process.env.INWORLD_MAN_VOICE_ID || 'Dennis' // Man's voice ID for introduction and chapter sections
const INWORLD_WOMAN_VOICE_ID = process.env.INWORLD_WOMAN_VOICE_ID || 'Dennis' // Woman's voice ID for quiz questions (can be changed to a different voice)
const INWORLD_MODEL_ID = process.env.INWORLD_MODEL_ID || 'inworld-tts-1' // Model: inworld-tts-1 or inworld-tts-1-max
const INWORLD_TEMPERATURE = parseFloat(process.env.INWORLD_TEMPERATURE || '1.1') // Temperature (0.0 to 2.0, default 1.1). Higher = more random/expressive, lower = more deterministic

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

    if (!INWORLD_API_KEY) {
      return NextResponse.json(
        { error: 'Inworld AI API key is not configured. Please set INWORLD_API_KEY in your .env file. Format: Base64(workspace_id:api_key). Restart the server after updating.' },
        { status: 500 }
      )
    }

    const { text, type, voiceId, context, temperature } = await request.json() // type: 'audio' or 'timestamps' or 'both', voiceId: optional voice ID override, context: 'quiz' or 'section' or 'introduction', temperature: optional temperature override (0.0 to 2.0)

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Determine voice ID:
    // 1. If voiceId is explicitly provided, use it
    // 2. If context is 'quiz', use woman's voice
    // 3. Otherwise (sections, introduction), use man's voice (default)
    let selectedVoiceId: string
    if (voiceId) {
      selectedVoiceId = voiceId
    } else if (context === 'quiz') {
      selectedVoiceId = INWORLD_WOMAN_VOICE_ID
    } else {
      // Default to man's voice for introduction and sections
      selectedVoiceId = INWORLD_MAN_VOICE_ID
    }

    // Use temperature from request or fallback to environment variable or default
    const selectedTemperature = temperature !== undefined && temperature !== null 
      ? parseFloat(temperature.toString()) 
      : INWORLD_TEMPERATURE

    // Generate audio and timestamps using Inworld AI TTS API
    // Inworld provides both audio and word-level timestamps in a single API call
    console.log('🔄 Generating audio and timestamps using Inworld AI...')
    console.log('   Voice ID:', selectedVoiceId)
    console.log('   Model ID:', INWORLD_MODEL_ID)
    console.log('   Temperature:', selectedTemperature)
    
    let audioBytes: Buffer
    let timestampsData: any
    
    try {
      const result = await generateAudioWithInworld(
        text,
        selectedVoiceId,
        INWORLD_MODEL_ID,
        INWORLD_API_KEY,
        'MP3', // Audio encoding: MP3, OGG_OPUS, LINEAR16, etc.
        1.0, // Speaking rate (0.5 to 1.5)
        48000, // Sample rate in Hz
        selectedTemperature // Temperature (0.0 to 2.0)
      )
      
      audioBytes = result.audioBuffer
      timestampsData = result.timestampData
      
      console.log('✅ Inworld AI audio and timestamps generated successfully:', {
        audioSize: audioBytes.length,
        wordCount: timestampsData.segments[0]?.words?.length || 0,
      })
    } catch (inworldError: any) {
      console.error('❌ Inworld AI API error:', inworldError.message)
      return NextResponse.json(
        { error: `Failed to generate audio: ${inworldError.message}` },
        { status: 500 }
      )
    }

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
    
    // IMPORTANT: On deployed servers (especially serverless), files in public/ may not persist
    // Consider using a cloud storage service (S3, Cloudinary, etc.) for production
    // For now, return the URL but note that it may not be accessible on deployed servers

    // Save timestamps file (Inworld AI provides timestamps directly, no need for WhisperX)
    const timestampsDir = 'public/timestamps'
    const timestampsPath = join(process.cwd(), timestampsDir)

    if (!existsSync(timestampsPath)) {
      await mkdir(timestampsPath, { recursive: true })
    }

    const timestampsFileName = `${timestamp}-${sanitizedText}.timestamps.json`
    const timestampsFilePath = join(timestampsPath, timestampsFileName)
    
    // Save timestamps data
    await writeFile(timestampsFilePath, JSON.stringify(timestampsData, null, 2))
    console.log(`✅ Timestamps file saved: ${timestampsFileName}`)

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

