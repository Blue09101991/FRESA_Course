import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    return NextResponse.json({ chapter })
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    )
  }
}

