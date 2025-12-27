import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['Admin', 'Developer', 'Editor', 'Student']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database is not configured. Please set DATABASE_URL in your .env file.' },
        { status: 500 }
      )
    }

    // Validate request body
    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { email, username, password, name, phone, role } = signupSchema.parse(body)

    // Check if user already exists by email
    let existingUserByEmail;
    try {
      existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      if (dbError.code === 'P1001' || dbError.code === 'P1000' || dbError.code === 'P1017') {
        return NextResponse.json(
          { error: 'Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.' },
          { status: 500 }
        )
      }
      throw dbError
    }

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Default role is Student, but allow Admin to create other roles
    const userRole = role || UserRole.Student

    // Create user
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name,
          phone: phone || null,
          role: userRole,
        },
      })
    } catch (createError: any) {
      console.error('User creation error:', createError)
      console.error('Error code:', createError.code)
      console.error('Error message:', createError.message)
      
      if (createError.code === 'P2002') {
        const field = createError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `${field} already exists` },
          { status: 400 }
        )
      }
      
      throw createError
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      )
    }
    
    // Handle database connection errors
    if (error.code === 'P1001' || error.code === 'P1000' || error.code === 'P1017') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check: 1) DATABASE_URL in .env file, 2) PostgreSQL is running, 3) Database exists' },
        { status: 500 }
      )
    }
    
    // Handle table doesn't exist error
    if (error.code === 'P2021' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
        { status: 500 }
      )
    }
    
    console.error('Signup error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Return more specific error message
    const errorMessage = error.message || 'Failed to create user'
    return NextResponse.json(
      { error: errorMessage, code: error.code || 'UNKNOWN' },
      { status: 500 }
    )
  }
}

