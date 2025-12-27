import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, comparePassword } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  phone: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email !== currentUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Check if username is being changed and if it's already taken
    if (validatedData.username !== currentUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validatedData.username },
      })
      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        )
      }
    }

    // Handle password change
    let hashedPassword = currentUser.password
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        )
      }

      // Verify current password
      const isPasswordValid = await comparePassword(
        validatedData.currentPassword,
        currentUser.password
      )

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Hash new password
      hashedPassword = await hashPassword(validatedData.newPassword)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        username: validatedData.username,
        phone: validatedData.phone || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        role: true,
      },
    })

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Profile updated successfully' 
    })
  } catch (error: any) {
    console.error('Profile update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      )
    }

    if (error.code === 'P1001' || error.code === 'P1000') {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

