import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies (for admin auth)
  const adminToken = request.cookies.get('token')?.value;
  
  // Define paths that require admin authentication
  const adminRequiredPaths = [
    '/admin/upload',
    '/profile',
  ];
  
  // Check if the path requires admin authentication
  const requiresAdminAuth = adminRequiredPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Debugging
  console.log('Path:', pathname);
  console.log('Admin Token:', adminToken ? 'Present' : 'Missing');
  
  // If the path requires admin auth and there's no admin token, redirect to admin login
  if (requiresAdminAuth && !adminToken) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // If the path is admin login and the user is already logged in as admin, redirect to admin upload
  if (pathname === '/auth/login' && adminToken) {
    return NextResponse.redirect(new URL('/admin/upload', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware runs on - only protect specific admin routes
export const config = {
  matcher: [
    '/admin/upload/:path*',
    '/profile/:path*',
    '/auth/login',
  ],
}; 