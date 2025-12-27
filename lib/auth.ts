import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string
  role: UserRole
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Alias for verifyPassword (for consistency)
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return verifyPassword(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    console.log('[verifyToken] Token verified successfully:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      username: decoded.username
    })
    return decoded
  } catch (error: any) {
    console.error('[verifyToken] Token verification failed:', {
      error: error.message,
      errorName: error.name,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...',
      jwtSecretSet: !!JWT_SECRET,
      jwtSecretLength: JWT_SECRET?.length
    })
    return null
  }
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

export function canEdit(userRole: UserRole): boolean {
  return hasRole(userRole, [UserRole.Admin, UserRole.Developer, UserRole.Editor])
}

export function canDelete(userRole: UserRole): boolean {
  return hasRole(userRole, [UserRole.Admin, UserRole.Developer])
}

