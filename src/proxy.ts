import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // Exclude static files, API routes, Next.js internals
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session')?.value;

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
