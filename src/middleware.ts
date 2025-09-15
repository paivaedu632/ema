import { NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/api/v1/health',
  '/api/v1/market' // Market data is public
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes to pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For API routes, we'll handle authentication in the route handlers
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For protected frontend routes, let ProtectedRoute component handle auth
  // Supabase handles session persistence automatically
  // The ProtectedRoute component will redirect if needed

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
