import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // Allow auth routes and API routes
  if (
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // For now, allow all other routes - better-auth will handle session checking on the client
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
