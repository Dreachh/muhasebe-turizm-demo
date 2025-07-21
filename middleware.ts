import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isServerSide } from './lib/firebase-config';

export async function middleware(request: NextRequest) {
  // Sunucu tarafı olduğunu kontrol et
  if (isServerSide()) {
    console.log('Middleware sunucu tarafında çalışıyor');
  }

  // Login sayfasına gelen tüm istekleri ana sayfaya yönlendir
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname.includes('/login')
  ) {
    console.log('Login sayfası isteği ana sayfaya yönlendiriliyor');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // API ve statik dosya istekleri için direkt geçiş
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.includes('_next') ||
    request.nextUrl.pathname.includes('favicon.ico')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Middleware'in çalışacağı yollar
export const config = {
  matcher: [
    '/',
    '/login',
    '/api/:path*',
    '/_next/static/:path*',
  ],
};
