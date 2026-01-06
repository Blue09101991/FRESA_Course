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

    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')
    const quizType = searchParams.get('quizType')

    const where: any = {}
    if (chapterId) where.chapterId = chapterId
    if (quizType) where.quizType = quizType

    const questions = await prisma.quizQuestion.findMany({
      where,
      orderBy: { order: 'asc' },
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

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching quiz questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
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

    const body = await request.json()
    const { question, options, correctAnswer, explanation, chapterId, quizType, order, audioUrl, timestampsUrl, questionAudioUrl, questionTimestampsUrl, optionAudioUrls, optionTimestampsUrls, explanationAudioUrl, explanationTimestampsUrl, correctExplanationAudioUrl, correctExplanationTimestampsUrl, incorrectExplanationAudioUrls, incorrectExplanationTimestampsUrls } = body

    if (!question || !options || correctAnswer === undefined) {
      return NextResponse.json(
        { error: 'Question, options, and correctAnswer are required' },
        { status: 400 }
      )
    }

    const quizQuestion = await prisma.quizQuestion.create({
      data: {
        question,
        options,
        correctAnswer: parseInt(correctAnswer),
        explanation: explanation || { correct: '', incorrect: [] },
        chapterId: chapterId || null,
        quizType: quizType || 'chapter',
        order: order || 0,
        audioUrl: audioUrl || null,
        timestampsUrl: timestampsUrl || null,
        questionAudioUrl: questionAudioUrl || null,
        questionTimestampsUrl: questionTimestampsUrl || null,
        optionAudioUrls: optionAudioUrls || null,
        optionTimestampsUrls: optionTimestampsUrls || null,
        explanationAudioUrl: explanationAudioUrl || null,
        explanationTimestampsUrl: explanationTimestampsUrl || null,
        correctExplanationAudioUrl: correctExplanationAudioUrl || null,
        correctExplanationTimestampsUrl: correctExplanationTimestampsUrl || null,
        incorrectExplanationAudioUrls: incorrectExplanationAudioUrls || null,
        incorrectExplanationTimestampsUrls: incorrectExplanationTimestampsUrls || null,
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

    return NextResponse.json({ question: quizQuestion })
  } catch (error) {
    console.error('Error creating quiz question:', error)
    return NextResponse.json(
      { error: 'Failed to create quiz question' },
      { status: 500 }
    )
  }
}

