import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'
import { UserRole } from '@prisma/client'

export async function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/introduction', '/chapter-1', '/eligibility', '/congratulations', '/login', '/signup']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Admin routes that require authentication
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isAdminApiRoute = request.nextUrl.pathname.startsWith('/api/admin')

  if (isAdminRoute || isAdminApiRoute) {
    const cookieToken = request.cookies.get('auth-token')?.value
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const token = cookieToken || headerToken

    console.log('[Middleware] Token check:', {
      path: request.nextUrl.pathname,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      allCookies: Array.from(request.cookies.getAll()).map(c => c.name)
    })

    if (!token) {
      console.log('[Middleware] No token found for admin route:', request.nextUrl.pathname)
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Store intended destination before redirecting
      const response = NextResponse.redirect(new URL('/login', request.url))
      return response
    }

    const user = await verifyTokenEdge(token)
    console.log('[Middleware] Token verification result:', {
      hasUser: !!user,
      userRole: user?.role,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('[Middleware] Invalid token for admin route:', request.nextUrl.pathname)
      console.log('[Middleware] Token that failed:', token.substring(0, 50) + '...')
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      // Clear invalid token cookie
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    // Check role for admin routes
    // user.role from JWT is a string, so compare as string
    const allowedRoles = ['Admin', 'Developer', 'Editor']
    const userRole = user.role as string
    console.log('[Middleware] Checking role:', { userRole, allowedRoles, isAllowed: allowedRoles.includes(userRole) })
    
    if (!allowedRoles.includes(userRole)) {
      console.log('[Middleware] Role not allowed:', userRole)
      if (isAdminApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('[Middleware] Access granted to admin route')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

