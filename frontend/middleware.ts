import { NextResponse, type NextRequest } from 'next/server'

// We bypass Supabase check entirely and rely on client-side token check
// The actual auth guard happens in React (getToken from localStorage)
export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  
  // Let Next.js serve all pages — client-side handles redirect logic
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
