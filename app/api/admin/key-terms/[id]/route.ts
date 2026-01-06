import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit, canDelete } from '@/lib/auth'

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
    const { term, order, audioUrl, timestampsUrl } = await request.json()

    const keyTerm = await prisma.keyTerm.update({
      where: { id },
      data: {
        term,
        order: order || 0,
        audioUrl: audioUrl || null,
        timestampsUrl: timestampsUrl || null,
      },
    })

    return NextResponse.json({ keyTerm })
  } catch (error) {
    console.error('Error updating key term:', error)
    return NextResponse.json(
      { error: 'Failed to update key term' },
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
    await prisma.keyTerm.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting key term:', error)
    return NextResponse.json(
      { error: 'Failed to delete key term' },
      { status: 500 }
    )
  }
}

