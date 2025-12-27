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

    const keyTerms = await prisma.keyTerm.findMany({
      where: chapterId ? { chapterId } : undefined,
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ keyTerms })
  } catch (error) {
    console.error('Error fetching key terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch key terms' },
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

    const { chapterId, term, order } = await request.json()

    const keyTerm = await prisma.keyTerm.create({
      data: {
        chapterId,
        term,
        order: order || 0,
      },
    })

    return NextResponse.json({ keyTerm }, { status: 201 })
  } catch (error) {
    console.error('Error creating key term:', error)
    return NextResponse.json(
      { error: 'Failed to create key term' },
      { status: 500 }
    )
  }
}

