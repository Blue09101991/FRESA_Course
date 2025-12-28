import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'

// Introduction is stored as a special section with chapterId = null or a special flag
// For simplicity, we'll use a special chapter number 0 or create a dedicated table
// For now, let's use a special approach: store in a section with type='introduction'

export async function GET(request: NextRequest) {
  try {
    // This route is public - frontend needs to fetch introduction content
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

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { text, audioUrl, timestampsUrl } = body

    // Validate that audio and timestamps files exist if URLs are provided
    let validatedAudioUrl = audioUrl || null
    let validatedTimestampsUrl = timestampsUrl || null

    if (validatedAudioUrl) {
      // Remove leading slash and check if file exists in public/audio
      const audioPath = validatedAudioUrl.startsWith('/') ? validatedAudioUrl.slice(1) : validatedAudioUrl
      const fullAudioPath = join(process.cwd(), 'public', audioPath)
      
      if (!existsSync(fullAudioPath)) {
        console.warn(`⚠️ Audio file not found: ${fullAudioPath}. Setting audioUrl to null.`)
        validatedAudioUrl = null
      }
    }

    if (validatedTimestampsUrl) {
      // Remove leading slash and check if file exists in public/timestamps
      const timestampsPath = validatedTimestampsUrl.startsWith('/') ? validatedTimestampsUrl.slice(1) : validatedTimestampsUrl
      const fullTimestampsPath = join(process.cwd(), 'public', timestampsPath)
      
      if (!existsSync(fullTimestampsPath)) {
        console.warn(`⚠️ Timestamps file not found: ${fullTimestampsPath}. Setting timestampsUrl to null.`)
        validatedTimestampsUrl = null
      }
    }

    // Find or create introduction section
    let introduction = await prisma.section.findFirst({
      where: {
        type: 'introduction',
      },
    })

    if (introduction) {
      // Update existing
      introduction = await prisma.section.update({
        where: { id: introduction.id },
        data: {
          text,
          audioUrl: validatedAudioUrl,
          timestampsUrl: validatedTimestampsUrl,
        },
      })
    } else {
      // Create new (we need a chapterId, so we'll use a dummy or create a special chapter)
      // For now, let's create a special chapter 0 for introduction
      let introChapter = await prisma.chapter.findUnique({
        where: { number: 0 },
      })

      if (!introChapter) {
        introChapter = await prisma.chapter.create({
          data: {
            number: 0,
            title: 'Introduction',
            description: 'Course Introduction Page',
          },
        })
      }

      introduction = await prisma.section.create({
        data: {
          chapterId: introChapter.id,
          sectionNumber: 0,
          title: 'Introduction',
          text,
          type: 'introduction',
          audioUrl: validatedAudioUrl,
          timestampsUrl: validatedTimestampsUrl,
          order: 0,
        },
      })
    }

    return NextResponse.json({
      introduction: {
        id: introduction.id,
        text: introduction.text,
        audioUrl: introduction.audioUrl,
        timestampsUrl: introduction.timestampsUrl,
      },
    })
  } catch (error) {
    console.error('Error saving introduction:', error)
    return NextResponse.json(
      { error: 'Failed to save introduction' },
      { status: 500 }
    )
  }
}

