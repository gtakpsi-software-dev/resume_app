import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  const adminToken = request.cookies.get('token')?.value;
  
  const adminRequiredPaths = [
    '/admin/upload',
    '/profile',
  ];
  
  const requiresAdminAuth = adminRequiredPaths.some(path => 
    pathname.startsWith(path)
  );
  
  if (requiresAdminAuth && !adminToken) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  if (pathname === '/auth/login' && adminToken) {
    return NextResponse.redirect(new URL('/admin/upload', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/upload/:path*',
    '/profile/:path*',
    '/auth/login',
  ],
}; 