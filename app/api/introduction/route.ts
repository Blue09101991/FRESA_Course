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

    if (introduction) {
      // Return URLs from database - don't validate strictly
      // Let browser handle 404s, files might be generated dynamically
      return NextResponse.json({
        introduction: {
          id: introduction.id,
          text: introduction.text,
          audioUrl: introduction.audioUrl || '/audio/intro.mp3',
          timestampsUrl: introduction.timestampsUrl || '/timestamps/intro.timestamps.json',
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

