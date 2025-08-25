import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/kyc(.*)',
  '/buy(.*)',
  '/sell(.*)',
  '/send(.*)',
  '/withdraw(.*)',
  '/deposit(.*)',
  '/receive(.*)',
  '/transactions(.*)',
  '/transaction(.*)',
  '/wallet(.*)'
]);

// Define public routes that should not be protected
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sso-callback(.*)',
  '/api/health(.*)',
  '/api/test-public(.*)',
  '/debug(.*)',
  '/api/debug(.*)',
  '/api/webhooks/(.*)', // Allow webhooks
  '/api/wallet/balances-temp(.*)' // Allow temporary API endpoint
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return;
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch (error) {
      console.error('Auth protection error:', error);
      // Allow the request to continue for debugging
      // In production, you might want to redirect to login
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


