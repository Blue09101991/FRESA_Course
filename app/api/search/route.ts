import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Search function for students and admin
// Searches through chapters, sections, learning objectives, key terms, and quiz questions
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const searchQuery = request.nextUrl.searchParams.get('q')
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const query = searchQuery.trim().toLowerCase()

    // Search in chapters (title and description)
    const chapters = await prisma.chapter.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
      },
    })

    // Search in sections (title and text)
    const sections = await prisma.section.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { text: { contains: query, mode: 'insensitive' } },
        ],
        type: { not: 'introduction' }, // Exclude introduction sections
      },
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    // Search in learning objectives
    const learningObjectives = await prisma.learningObjective.findMany({
      where: {
        text: { contains: query, mode: 'insensitive' },
      },
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
    })

    // Search in key terms
    const keyTerms = await prisma.keyTerm.findMany({
      where: {
        term: { contains: query, mode: 'insensitive' },
      },
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
    })

    // Search in quiz questions
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: {
        question: { contains: query, mode: 'insensitive' },
      },
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
    })

    // Search in introduction
    const introduction = await prisma.section.findFirst({
      where: {
        type: 'introduction',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { text: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        text: true,
      },
    })

    // Format results
    const results = {
      query: searchQuery,
      chapters: chapters.map(ch => ({
        type: 'chapter',
        id: ch.id,
        chapterNumber: ch.number,
        title: ch.title,
        description: ch.description,
        path: ch.number === 0 ? '/introduction' : `/chapter-${ch.number}`,
      })),
      sections: sections.map(sec => ({
        type: 'section',
        id: sec.id,
        chapterId: sec.chapterId,
        chapterNumber: sec.chapter?.number,
        chapterTitle: sec.chapter?.title,
        title: sec.title,
        text: sec.text,
        path: sec.chapter?.number === 0 ? '/introduction' : `/chapter-${sec.chapter?.number}`,
        sectionId: sec.id,
      })),
      learningObjectives: learningObjectives.map(obj => ({
        type: 'learningObjective',
        id: obj.id,
        chapterId: obj.chapterId,
        chapterNumber: obj.chapter?.number,
        chapterTitle: obj.chapter?.title,
        text: obj.text,
        path: obj.chapter?.number === 0 ? '/introduction' : `/chapter-${obj.chapter?.number}`,
      })),
      keyTerms: keyTerms.map(term => ({
        type: 'keyTerm',
        id: term.id,
        chapterId: term.chapterId,
        chapterNumber: term.chapter?.number,
        chapterTitle: term.chapter?.title,
        term: term.term,
        path: term.chapter?.number === 0 ? '/introduction' : `/chapter-${term.chapter?.number}`,
      })),
      quizQuestions: quizQuestions.map(q => ({
        type: 'quizQuestion',
        id: q.id,
        chapterId: q.chapterId,
        chapterNumber: q.chapter?.number,
        chapterTitle: q.chapter?.title,
        question: q.question,
        path: q.chapter?.number === 0 ? '/introduction' : `/chapter-${q.chapter?.number}`,
      })),
      introduction: introduction ? {
        type: 'introduction',
        id: introduction.id,
        title: introduction.title,
        text: introduction.text,
        path: '/introduction',
      } : null,
    }

    // Calculate total results
    const totalResults = 
      results.chapters.length +
      results.sections.length +
      results.learningObjectives.length +
      results.keyTerms.length +
      results.quizQuestions.length +
      (results.introduction ? 1 : 0)

    return NextResponse.json({
      ...results,
      totalResults,
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}

