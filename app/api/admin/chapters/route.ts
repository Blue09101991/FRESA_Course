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

    const chapters = await prisma.chapter.findMany({
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

    const chapter = await prisma.chapter.create({
      data: {
        number,
        title,
        description: description || null,
      },
    })

    return NextResponse.json({ chapter }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating chapter:', error)
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    )
  }
}

