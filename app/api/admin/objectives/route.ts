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

    const objectives = await prisma.learningObjective.findMany({
      where: chapterId ? { chapterId } : undefined,
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ objectives })
  } catch (error) {
    console.error('Error fetching objectives:', error)
    return NextResponse.json(
      { error: 'Failed to fetch objectives' },
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

    const { chapterId, text, order } = await request.json()

    const objective = await prisma.learningObjective.create({
      data: {
        chapterId,
        text,
        order: order || 0,
      },
    })

    return NextResponse.json({ objective }, { status: 201 })
  } catch (error) {
    console.error('Error creating objective:', error)
    return NextResponse.json(
      { error: 'Failed to create objective' },
      { status: 500 }
    )
  }
}

