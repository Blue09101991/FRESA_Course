import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'

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

    // Get all chapters except chapter 0 (introduction chapter)
    const chapters = await prisma.chapter.findMany({
      where: {
        number: { not: 0 }, // Exclude chapter 0 (introduction)
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json({ chapters })
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let chapterNumber: number | undefined;
  
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

    const { number, title, description } = await request.json()
    chapterNumber = number;

    // Validate input
    if (!number || number < 1) {
      return NextResponse.json(
        { error: 'Chapter number must be at least 1' },
        { status: 400 }
      )
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Chapter title is required' },
        { status: 400 }
      )
    }

    // Check if chapter number already exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { number },
    })

    if (existingChapter) {
      return NextResponse.json(
        { error: `Chapter ${number} already exists. Please choose a different chapter number.` },
        { status: 409 }
      )
    }

    const chapter = await prisma.chapter.create({
      data: {
        number,
        title: title.trim(),
        description: description?.trim() || null,
      },
    })

    return NextResponse.json({ chapter }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating chapter:', error)
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: chapterNumber ? `Chapter ${chapterNumber} already exists. Please choose a different chapter number.` : 'Chapter number already exists. Please choose a different chapter number.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create chapter' },
      { status: 500 }
    )
  }
}

