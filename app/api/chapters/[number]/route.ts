import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { join } from 'path'

// Helper function to validate file exists
function validateFileUrl(url: string | null): string | null {
  if (!url) return null
  
  // Remove leading slash and check if file exists
  const filePath = url.startsWith('/') ? url.slice(1) : url
  const fullPath = join(process.cwd(), 'public', filePath)
  
  if (!existsSync(fullPath)) {
    console.warn(`⚠️ File not found: ${fullPath}. Returning null for URL.`)
    return null
  }
  
  return url
}

// Public API to fetch chapter content for frontend pages
// This route is public and doesn't require authentication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params
    const chapterNumber = parseInt(number)

    if (isNaN(chapterNumber)) {
      return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 })
    }

    // Fetch chapter from database (should be seeded with original data)
    const chapter = await prisma.chapter.findUnique({
      where: { number: chapterNumber },
      include: {
        sections: {
          // Get ALL sections for the chapter (introduction sections are in chapter 0, not regular chapters)
          orderBy: { order: 'asc' },
        },
        learningObjectives: {
          orderBy: { order: 'asc' },
        },
        keyTerms: {
          orderBy: { order: 'asc' },
        },
        quizQuestions: {
          where: {
            quizType: 'chapter',
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found. Please run the seed script to initialize data.' }, { status: 404 })
    }

    // Validate that audio and timestamps files exist for all sections
    const validatedChapter = {
      ...chapter,
      sections: chapter.sections.map((section: any) => ({
        ...section,
        audioUrl: validateFileUrl(section.audioUrl) || section.audioUrl, // Keep original URL if file doesn't exist (might be generated)
        timestampsUrl: validateFileUrl(section.timestampsUrl) || section.timestampsUrl,
      })),
    }

    return NextResponse.json({ chapter: validatedChapter })
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    )
  }
}

