// Edge Runtime compatible auth functions (for middleware)
import { jwtVerify } from 'jose'
import { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string
  role: UserRole
}

// Convert JWT_SECRET string to Uint8Array for jose
function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET)
}

// Verify token in Edge Runtime (for middleware)
export async function verifyTokenEdge(token: string): Promise<AuthUser | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey)
    
    const user: AuthUser = {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    }
    
    console.log('[verifyTokenEdge] Token verified successfully:', {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username
    })
    
    return user
  } catch (error: any) {
    console.error('[verifyTokenEdge] Token verification failed:', {
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

