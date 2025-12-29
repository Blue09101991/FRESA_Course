import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit, canDelete } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const question = await prisma.quizQuestion.findUnique({
      where: { id },
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

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error fetching quiz question:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz question' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { question, options, correctAnswer, explanation, chapterId, quizType, order, audioUrl, timestampsUrl, explanationAudioUrl, explanationTimestampsUrl, correctExplanationAudioUrl, correctExplanationTimestampsUrl, incorrectExplanationAudioUrls, incorrectExplanationTimestampsUrls } = body

    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id },
      data: {
        question,
        options,
        correctAnswer: correctAnswer !== undefined ? parseInt(correctAnswer) : undefined,
        explanation,
        chapterId: chapterId || null,
        quizType,
        order,
        audioUrl: audioUrl !== undefined ? audioUrl : undefined,
        timestampsUrl: timestampsUrl !== undefined ? timestampsUrl : undefined,
        explanationAudioUrl: explanationAudioUrl !== undefined ? explanationAudioUrl : undefined,
        explanationTimestampsUrl: explanationTimestampsUrl !== undefined ? explanationTimestampsUrl : undefined,
        correctExplanationAudioUrl: correctExplanationAudioUrl !== undefined ? correctExplanationAudioUrl : undefined,
        correctExplanationTimestampsUrl: correctExplanationTimestampsUrl !== undefined ? correctExplanationTimestampsUrl : undefined,
        incorrectExplanationAudioUrls: incorrectExplanationAudioUrls !== undefined ? incorrectExplanationAudioUrls : undefined,
        incorrectExplanationTimestampsUrls: incorrectExplanationTimestampsUrls !== undefined ? incorrectExplanationTimestampsUrls : undefined,
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

    return NextResponse.json({ question: updatedQuestion })
  } catch (error) {
    console.error('Error updating quiz question:', error)
    return NextResponse.json(
      { error: 'Failed to update quiz question' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canDelete(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await prisma.quizQuestion.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quiz question:', error)
    return NextResponse.json(
      { error: 'Failed to delete quiz question' },
      { status: 500 }
    )
  }
}

