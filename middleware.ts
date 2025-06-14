import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isServerSide } from './lib/firebase-config';

export async function middleware(request: NextRequest) {
  // Sunucu tarafı olduğunu kontrol et ve ona göre davran
  if (isServerSide()) {
    console.log('Middleware sunucu tarafında çalışıyor');
  }

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

// Middleware'in çalışacağı yollar - Sadece gerekli rotaları ekle
export const config = {
  matcher: ['/', '/admin/:path*'],
};
