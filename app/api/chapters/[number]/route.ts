import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDefaultChapterData, mergeWithDefaults } from '@/lib/defaultChapterData'

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

    // Get default chapter data
    const defaultData = getDefaultChapterData(chapterNumber)
    
    // Try to fetch from database
    let chapter = await prisma.chapter.findUnique({
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

    // If chapter doesn't exist in DB, create it with default data
    if (!chapter && defaultData) {
      chapter = await prisma.chapter.create({
        data: {
          number: defaultData.number,
          title: defaultData.title,
          description: defaultData.description,
        },
        include: {
          sections: true,
          learningObjectives: true,
          keyTerms: true,
          quizQuestions: true,
        },
      })
    }

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Merge database data with defaults
    let finalChapter = chapter
    if (defaultData) {
      finalChapter = mergeWithDefaults(chapter, defaultData)
    }

    // Validate that audio and timestamps files exist for all sections
    const validatedChapter = {
      ...finalChapter,
      sections: finalChapter.sections.map((section: any) => ({
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

