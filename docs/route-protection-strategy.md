# EmaPay Route Protection Strategy

## Overview

This document outlines the standardized approach for implementing route protection in the EmaPay application. Following the dashboard route protection refactoring, this strategy ensures consistent and secure authentication patterns across all routes.

## Current Implementation Status

### ✅ Protected Routes
- **Dashboard (`/`)** - Main application dashboard, requires authentication
- **Login (`/login`)** - Uses `PublicRoute` to redirect authenticated users
- **Signup (`/signup`)** - Uses `PublicRoute` to redirect authenticated users

### 🚧 Development Routes (Currently Unprotected)
The following routes are intentionally left unprotected during development phase:
- `/send` - Money transfer functionality
- `/wallet` - Wallet management
- `/transactions` - Transaction history
- `/convert` - Currency conversion
- `/receive` - Receive money functionality
- `/withdraw` - Withdrawal functionality
- `/kyc/*` - Know Your Customer flows

## Authentication Components

### Primary Implementation
**Location**: `src/components/auth/protected-route.tsx`

This is the **ONLY** implementation that should be used for route protection.

#### ProtectedRoute Component
```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function SecurePage() {
  return (
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  )
}
```

#### PublicRoute Component
```typescript
import { PublicRoute } from '@/components/auth/protected-route'

export default function LoginPage() {
  return (
    <PublicRoute>
      <LoginComponent />
    </PublicRoute>
  )
}
```

#### Higher-Order Components
```typescript
import { withAuth } from '@/components/auth/protected-route'

const SecureComponent = withAuth(YourComponent, {
  redirectTo: '/login',
  fallback: <CustomLoadingComponent />
})
```

### Key Features
- **Centralized Auth State**: Uses `useAuth()` hook for consistent state management
- **Configurable Redirects**: Custom redirect destinations via `redirectTo` prop
- **Custom Fallbacks**: Override loading states with `fallback` prop
- **Proper Loading States**: Shows loading animation during authentication checks
- **Clean Redirects**: Seamless navigation for unauthenticated users

## Implementation Guidelines

### When to Protect Routes

#### ✅ Always Protect
- Financial operations (transfers, exchanges, withdrawals)
- User data access (profiles, transaction history, wallets)
- Administrative functions
- Settings and configuration pages

#### ❌ Keep Public
- Marketing pages
- Authentication pages (login/signup)
- Public API documentation
- Health check endpoints

### How to Protect New Routes

#### Step 1: Import the Correct Component
```typescript
// ✅ CORRECT - Use this import
import { ProtectedRoute } from '@/components/auth/protected-route'

// ❌ WRONG - Never use this (file has been removed)
import { ProtectedRoute } from '@/components/features/auth/protected-route'
```

#### Step 2: Wrap Your Page Component
```typescript
// src/app/your-new-route/page.tsx
import YourComponent from '@/components/features/your-component'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function YourPage() {
  return (
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  )
}
```

#### Step 3: Test Authentication Flow
1. Verify unauthenticated users are redirected to `/login`
2. Confirm authenticated users can access the route
3. Check loading states display correctly
4. Test navigation after authentication

## Best Practices

### Do's ✅
- Always use `src/components/auth/protected-route.tsx`
- Test authentication flows after implementing protection
- Use consistent redirect patterns (`/login` for auth required)
- Implement proper loading states
- Document any custom authentication requirements

### Don'ts ❌
- Never create custom authentication logic in components
- Don't bypass the centralized `useAuth()` hook
- Avoid creating multiple ProtectedRoute implementations
- Don't forget to test both authenticated and unauthenticated states

## Future Enhancements

### Planned Improvements
1. **Role-Based Access Control**: Extend protection for different user roles
2. **Route-Level Permissions**: Fine-grained access control per route
3. **Enhanced Error Handling**: Better error states and recovery flows
4. **Performance Optimizations**: Reduce authentication check overhead

### Migration Timeline
- **Phase 1** ✅: Dashboard protection (completed)
- **Phase 2**: Financial operation routes (`/send`, `/wallet`, `/transactions`)
- **Phase 3**: User management routes (`/kyc/*`, `/profile`)
- **Phase 4**: Administrative and settings routes

## Troubleshooting

### Common Issues

#### Import Errors
```typescript
// Error: Cannot find module '@/components/features/auth/protected-route'
// Solution: Update import to use correct path
import { ProtectedRoute } from '@/components/auth/protected-route'
```

#### Authentication Loops
- Check that login/signup pages use `PublicRoute`
- Verify redirect destinations are correct
- Ensure `useAuth()` hook is properly configured

#### Loading State Issues
- Confirm `LoadingAnimation` component is available
- Check for proper fallback implementations
- Verify authentication state transitions

### Getting Help
- Review this documentation first
- Check existing protected route implementations
- Test authentication flows in development
- Consult the team for complex authentication requirements

---

**Last Updated**: January 2025  
**Next Review**: After Phase 2 implementation
