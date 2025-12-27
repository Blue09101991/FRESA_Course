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

    const chapterId = request.nextUrl.searchParams.get('chapterId')

    const sections = await prisma.section.findMany({
      where: chapterId ? { chapterId } : undefined,
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}

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

    const { chapterId, sectionNumber, title, text, type, audioUrl, timestampsUrl, order } = await request.json()

    const section = await prisma.section.create({
      data: {
        chapterId,
        sectionNumber,
        title,
        text,
        type: type || 'content',
        audioUrl: audioUrl || null,
        timestampsUrl: timestampsUrl || null,
        order: order || 0,
      },
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Failed to create section', details: error.message },
      { status: 500 }
    )
  }
}

