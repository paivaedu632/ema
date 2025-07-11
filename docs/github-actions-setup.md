# GitHub Actions CI/CD Setup for EmaPay

## 🔧 Required GitHub Secrets

To enable the CI/CD pipelines, add the following secrets to your GitHub repository:

### Supabase Configuration
```
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_PROJECT_REF=kjqcfedvilcnwzfjlqtq
NEXT_PUBLIC_SUPABASE_URL=https://kjqcfedvilcnwzfjlqtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Vercel Deployment
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

## 📋 Workflow Overview

### 1. Continuous Integration (`ci.yml`)
**Triggers**: Pull requests and pushes to master/main
**Purpose**: Validate code quality and database functionality

**Jobs**:
- **Lint and Type Check**: ESLint and TypeScript validation
- **Database Integration Tests**: Run all 66 database tests
- **Build Test**: Verify Next.js application builds
- **Security Audit**: npm audit and sensitive file detection
- **PR Summary**: Generate summary for pull requests

### 2. Database Tests (`database-tests.yml`)
**Triggers**: Changes to migrations or database tests
**Purpose**: Comprehensive database validation

**Jobs**:
- **Database Tests**: Run complete test suite (66 tests)
- **Schema Validation**: Verify table structure and constraints
- **Migration Rollback Tests**: Test migration safety

### 3. Production Deployment (`production-deployment.yml`)
**Triggers**: Pushes to master branch
**Purpose**: Deploy to production environment

**Jobs**:
- **Validate Database**: Ensure all 66 tests pass
- **Deploy to Supabase**: Push migrations to production
- **Deploy Frontend**: Deploy to Vercel
- **Post-Deployment Tests**: Validate production deployment

## 🎯 Test Requirements

All workflows require **66/66 database tests** to pass:

### Test Breakdown
- **Schema Validation**: 26 tests (table structure, indexes, constraints)
- **Order Placement**: 16 tests (limit/market orders, validation)
- **Matching Engine**: 9 tests (price-time priority, partial fills)
- **Fund Management**: 15 tests (reservations, balance integrity)

### Success Criteria
```bash
Tests: 66 passed, 66 total
Test Suites: 4 passed, 4 total
```

## 🚀 Deployment Flow

1. **Developer pushes to feature branch**
   - CI workflow runs (lint, test, build)
   - Database tests validate changes

2. **Pull request created**
   - Full CI validation
   - PR summary generated
   - Manual review required

3. **Merge to master**
   - Production deployment workflow triggers
   - Database migrations deployed to Supabase
   - Frontend deployed to Vercel
   - Post-deployment validation

## 🔍 Monitoring and Alerts

### Success Indicators
- ✅ All 66 database tests pass
- ✅ TypeScript compilation succeeds
- ✅ Next.js build completes
- ✅ Supabase migrations apply successfully
- ✅ Production validation passes

### Failure Handling
- ❌ Any test failure blocks deployment
- ❌ Build failures prevent production release
- ❌ Migration errors halt deployment
- ❌ Security audit issues require attention

## 📊 Performance Metrics

The CI/CD pipeline tracks:
- **Test execution time**: ~10-15 seconds
- **Build time**: ~2-3 minutes
- **Deployment time**: ~5-10 minutes
- **Success rate**: Target 95%+

## 🛠️ Local Development

To run the same tests locally:

```bash
# Database tests
npm run test:database

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Build
npm run build
```

## 🔧 Troubleshooting

### Common Issues

1. **Database tests failing**
   - Check migration file syntax
   - Verify test database connectivity
   - Ensure all 66 tests are included

2. **Build failures**
   - Check TypeScript errors
   - Verify environment variables
   - Review Next.js configuration

3. **Deployment issues**
   - Validate GitHub secrets
   - Check Supabase project access
   - Verify Vercel configuration

### Debug Commands

```bash
# Check migration status
npx supabase db push --dry-run

# Validate database schema
node scripts/test-remote-database.js

# Test local build
npm run build
```
