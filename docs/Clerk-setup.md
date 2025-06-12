# Clerk Authentication Setup Guide

## Overview

This document outlines the complete setup process for Clerk authentication in the EmaPay application, including lessons learned from implementation challenges and the correct patterns for custom UI with Clerk backend.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Environment Configuration](#environment-configuration)
3. [Route Structure](#route-structure)
4. [Custom UI Implementation](#custom-ui-implementation)
5. [OAuth Configuration](#oauth-configuration)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Testing & Validation](#testing--validation)

## Initial Setup

### 1. Install Clerk Dependencies

```bash
npm install @clerk/nextjs
```

### 2. Create Clerk Application

1. Visit [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application
3. Choose authentication methods (Email, Phone, Google OAuth)
4. Copy API keys

### 3. Basic Layout Configuration

```tsx
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

## Environment Configuration

### Required Environment Variables

```env
# .env.local

# Clerk API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Custom Page URLs (Required for custom UI)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

### ⚠️ Important Notes

- **DO NOT** set redirect URLs in ClerkProvider props when using environment variables
- Environment variables take precedence over component props
- Use fallback redirect URLs for better UX

## Route Structure

### Correct Route Structure for Custom UI

For custom authentication UI with Clerk backend, use catch-all routes:

```
src/app/
├── login/
│   └── [[...login]]/
│       └── page.tsx
├── signup/
│   └── [[...signup]]/
│       └── page.tsx
└── sso-callback/
    └── page.tsx
```

### Login Page Implementation

```tsx
// src/app/login/[[...login]]/page.tsx
import { Login } from "@/components/login"

export default function Page() {
  return <Login />
}
```

### Signup Page Implementation

```tsx
// src/app/signup/[[...signup]]/page.tsx
import { Signup } from "@/components/signup"

export default function Page() {
  return <Signup />
}
```

### SSO Callback Handler

```tsx
// src/app/sso-callback/page.tsx
"use client"

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback()
        router.push('/dashboard')
      } catch (error) {
        console.error('SSO callback error:', error)
        router.push('/login')
      }
    }
    handleCallback()
  }, [handleRedirectCallback, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  )
}
```

## Custom UI Implementation

### Two Approaches: Prebuilt vs Custom

#### ❌ Wrong Approach: Complex Custom Implementation
```tsx
// DON'T DO THIS - Overly complex custom implementation
const { signIn, signUp } = useClerk()
// Manual form handling, complex state management, custom OAuth flows
```

#### ✅ Correct Approach 1: Prebuilt Components (Fastest)
```tsx
// Use Clerk's prebuilt components for rapid development
import { SignIn, SignUp } from '@clerk/nextjs'

export default function LoginPage() {
  return <SignIn />
}
```

#### ✅ Correct Approach 2: Custom UI with Clerk Hooks (Recommended for EmaPay)
```tsx
// Custom UI with proper Clerk integration
import { useSignIn, useSignUp } from '@clerk/nextjs'

export function CustomLogin() {
  const { signIn, isLoaded } = useSignIn()

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard"
      })
    } catch (error) {
      console.error('OAuth error:', error)
    }
  }

  // Custom EmaPay UI with Clerk backend
  return (
    <div className="custom-emapay-design">
      <button onClick={handleGoogleSignIn}>
        Entrar com Google
      </button>
    </div>
  )
}
```

### Key Implementation Principles

1. **Use Clerk hooks** (`useSignIn`, `useSignUp`) for authentication logic
2. **Keep UI custom** while leveraging Clerk's backend
3. **Proper error handling** with user-friendly messages
4. **Loading states** for better UX
5. **Portuguese interface** for EmaPay branding

## OAuth Configuration

### Google OAuth Setup

#### 1. Clerk Dashboard Configuration
1. Go to Clerk Dashboard → User & Authentication → SSO connections
2. Add Google connection
3. For development: Use Clerk's shared credentials
4. For production: Set up custom Google OAuth credentials

#### 2. Custom Google OAuth Credentials (Production)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API and Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Add Clerk callback URLs
5. Add credentials to Clerk dashboard

#### 3. OAuth Implementation in Custom Components

```tsx
// Correct OAuth implementation
const handleGoogleAuth = async () => {
  if (!isLoaded) return

  try {
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",        // Important: Use SSO callback
      redirectUrlComplete: "/dashboard"     // Final destination
    })
  } catch (error) {
    setError("Authentication failed")
  }
}
```

### ⚠️ OAuth Common Issues

1. **Popup Blockers**: OAuth may be blocked by browser popup blockers
2. **Redirect URLs**: Must match exactly in Google Console and Clerk
3. **Development vs Production**: Different OAuth apps for different environments
4. **Session Conflicts**: Clear existing sessions when testing

## Middleware Configuration

### Required Middleware Setup

```tsx
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',      // Include catch-all routes
  '/signup(.*)',     // Include catch-all routes
  '/sso-callback'    // Important: Make SSO callback public
])

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/kyc(.*)',
  '/transactions(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

## Common Pitfalls & Solutions

### 1. Route Conflicts
**Problem**: `You cannot define a route with the same specificity as a optional catch-all route`

**Solution**:
- Use ONLY catch-all routes: `/login/[[...login]]/page.tsx`
- Remove conflicting `/login/page.tsx` files
- Ensure clean route structure

### 2. OAuth Redirect Issues
**Problem**: 404 errors on OAuth callbacks

**Solutions**:
- Create proper SSO callback handler at `/sso-callback/page.tsx`
- Update `redirectUrl` to `/sso-callback` in OAuth calls
- Add SSO callback to public routes in middleware

### 3. Environment Variable Conflicts
**Problem**: Redirects not working as expected

**Solutions**:
- Remove redirect props from ClerkProvider when using env vars
- Use `NEXT_PUBLIC_CLERK_*_FALLBACK_REDIRECT_URL` for fallbacks
- Restart dev server after env changes

### 4. Session Management
**Problem**: "Session already exists" errors during testing

**Solutions**:
- Add sign out functionality to dashboard
- Clear browser storage when testing
- Use incognito mode for clean testing

### 5. Hydration Errors
**Problem**: Server/client mismatch in authentication state

**Solutions**:
- Use `useEffect` for client-only authentication logic
- Implement proper loading states
- Avoid conditional rendering based on auth state in SSR

## Sign Out Implementation

### Custom Sign Out Button

```tsx
// Dashboard component with sign out
import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

export function Dashboard() {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="dashboard">
      <button
        onClick={handleSignOut}
        className="sign-out-button"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  )
}
```

## Testing & Validation

### Development Testing Checklist

- [ ] **Environment Setup**
  - [ ] All environment variables configured
  - [ ] Clerk dashboard settings match local config
  - [ ] Dev server restarts after env changes

- [ ] **Route Structure**
  - [ ] No route conflicts in terminal
  - [ ] Catch-all routes working: `/login`, `/signup`
  - [ ] SSO callback handler accessible: `/sso-callback`

- [ ] **Authentication Flow**
  - [ ] Custom login form works with email/password
  - [ ] Custom signup form works with email/password
  - [ ] Google OAuth redirects properly
  - [ ] OAuth completes and redirects to dashboard
  - [ ] Sign out functionality works

- [ ] **Error Handling**
  - [ ] Invalid credentials show proper errors
  - [ ] Network errors handled gracefully
  - [ ] Loading states display correctly
  - [ ] Portuguese error messages

- [ ] **User Experience**
  - [ ] EmaPay branding maintained throughout
  - [ ] Portuguese interface consistent
  - [ ] Smooth transitions between auth states
  - [ ] Mobile responsive design

### Production Deployment Checklist

- [ ] **OAuth Configuration**
  - [ ] Custom Google OAuth credentials configured
  - [ ] Production redirect URLs added to Google Console
  - [ ] Clerk production environment configured

- [ ] **Security**
  - [ ] Environment variables secured
  - [ ] HTTPS enabled for OAuth
  - [ ] Proper CORS configuration
  - [ ] Rate limiting configured

- [ ] **Performance**
  - [ ] Authentication flows optimized
  - [ ] Proper caching strategies
  - [ ] Bundle size optimized

## Best Practices Summary

### ✅ Do's
1. **Use catch-all routes** for custom auth pages
2. **Leverage Clerk hooks** for authentication logic
3. **Implement proper error handling** with user feedback
4. **Maintain EmaPay design consistency**
5. **Use environment variables** for configuration
6. **Create SSO callback handler** for OAuth flows
7. **Add sign out functionality** to dashboard
8. **Test thoroughly** in development

### ❌ Don'ts
1. **Don't mix route structures** (avoid conflicts)
2. **Don't set redirect URLs** in both props and env vars
3. **Don't ignore OAuth redirect requirements**
4. **Don't skip error handling**
5. **Don't forget to make SSO callback public**
6. **Don't use complex custom auth flows** when hooks suffice
7. **Don't skip loading states**
8. **Don't forget Portuguese localization**

## Conclusion

The key to successful Clerk integration with custom UI is:

1. **Proper route structure** with catch-all routes
2. **Correct OAuth implementation** with SSO callbacks
3. **Environment variable configuration** over component props
4. **Leveraging Clerk hooks** while maintaining custom design
5. **Thorough testing** of all authentication flows

This approach gives you the **best of both worlds**: Clerk's robust authentication backend with your beautiful custom EmaPay user interface.

---

*Last updated: January 2025*
*Implementation: EmaPay Custom Authentication with Clerk Backend*