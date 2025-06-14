import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // API ve statik dosya istekleri için direkt geçiş
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.includes('_next') ||
    request.nextUrl.pathname.includes('favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Eski login sayfalarına gelen istekleri ana sayfaya yönlendir
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname.startsWith('/admin/login')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Middleware'in çalışacağı yolları sadeleştiriyoruz
export const config = {
  matcher: ['/', '/admin/:path*'],
};
