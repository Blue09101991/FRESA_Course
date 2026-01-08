import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { join } from 'path'

// Public API route for introduction - no authentication required
export async function GET(request: NextRequest) {
  try {
    // Find introduction section (type = 'introduction')
    const introduction = await prisma.section.findFirst({
      where: {
        type: 'introduction',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Helper function to validate file exists
    const validateFileUrl = (url: string | null): string | null => {
      if (!url) return null
      const filePath = url.startsWith('/') ? url.slice(1) : url
      const fullPath = join(process.cwd(), 'public', filePath)
      return existsSync(fullPath) ? url : null
    }

    if (introduction) {
      const validatedAudioUrl = validateFileUrl(introduction.audioUrl) || '/audio/intro.mp3'
      const validatedTimestampsUrl = validateFileUrl(introduction.timestampsUrl) || '/timestamps/intro.timestamps.json'
      
      return NextResponse.json({
        introduction: {
          id: introduction.id,
          text: introduction.text,
          audioUrl: validatedAudioUrl,
          timestampsUrl: validatedTimestampsUrl,
        },
      })
    }

    // Return default if not found
    return NextResponse.json({
      introduction: {
        text: "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.",
        audioUrl: "/audio/intro.mp3",
        timestampsUrl: "/timestamps/intro.timestamps.json",
      },
    })
  } catch (error) {
    console.error('Error fetching introduction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch introduction' },
      { status: 500 }
    )
  }
}

