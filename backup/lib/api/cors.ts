import { NextRequest, NextResponse } from 'next/server';

// CORS configuration
const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  // Check if origin is allowed
  const allowedOrigin = CORS_CONFIG.origin.includes(origin || '') ? origin : CORS_CONFIG.origin[0];

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin || '*');
  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Allow-Credentials', CORS_CONFIG.credentials.toString());
  response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString());

  return response;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPrelight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 200 });
  
  return addCorsHeaders(response, origin || undefined);
}

/**
 * Middleware wrapper to add CORS support to API routes
 */
export function withCors<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const origin = request.headers.get('origin');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleCorsPrelight(request);
    }

    // Execute the handler
    const response = await handler(request, ...args);

    // Add CORS headers to the response
    return addCorsHeaders(response, origin || undefined);
  };
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  return CORS_CONFIG.origin.includes(origin);
}

/**
 * Get CORS configuration
 */
export function getCorsConfig() {
  return { ...CORS_CONFIG };
}
