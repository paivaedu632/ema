# GitHub Secrets Setup for EmaPay CI/CD

## 🔐 Required GitHub Secrets Configuration

To enable the complete CI/CD pipeline for EmaPay, you need to configure the following secrets in your GitHub repository.

### 📍 How to Add Secrets

1. Go to your GitHub repository: https://github.com/paivaedu632/ema
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## 🗄️ Supabase Configuration

### `SUPABASE_ACCESS_TOKEN`
**Description**: Personal access token for Supabase CLI
**How to get**:
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Copy the token value

### `SUPABASE_PROJECT_REF`
**Value**: `kjqcfedvilcnwzfjlqtq`
**Description**: Your Supabase project reference ID

### `NEXT_PUBLIC_SUPABASE_URL`
**Value**: `https://kjqcfedvilcnwzfjlqtq.supabase.co`
**Description**: Your Supabase project URL

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Description**: Supabase anonymous/public key
**How to get**:
1. Go to https://supabase.com/dashboard/project/kjqcfedvilcnwzfjlqtq/settings/api
2. Copy the "anon public" key

### `SUPABASE_SERVICE_ROLE_KEY`
**Description**: Supabase service role key (for server-side operations)
**How to get**:
1. Go to https://supabase.com/dashboard/project/kjqcfedvilcnwzfjlqtq/settings/api
2. Copy the "service_role" key
**⚠️ Warning**: Keep this secret secure - it has full database access

---

## 🔐 Clerk Authentication

### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
**Description**: Clerk publishable key for frontend
**How to get**:
1. Go to https://dashboard.clerk.com/
2. Select your EmaPay application
3. Go to **Developers** → **API Keys**
4. Copy the "Publishable key"

### `CLERK_SECRET_KEY`
**Description**: Clerk secret key for server-side operations
**How to get**:
1. In Clerk dashboard → **API Keys**
2. Copy the "Secret key"
**⚠️ Warning**: Keep this secret secure

---

## 🚀 Vercel Deployment (Optional)

### `VERCEL_TOKEN`
**Description**: Vercel personal access token
**How to get**:
1. Go to https://vercel.com/account/tokens
2. Create new token
3. Copy the token value

### `VERCEL_ORG_ID`
**Description**: Your Vercel organization ID
**How to get**:
1. Go to https://vercel.com/account
2. Copy the "Team ID" or "Personal Account ID"

### `VERCEL_PROJECT_ID`
**Description**: Your Vercel project ID for EmaPay
**How to get**:
1. Go to your project settings in Vercel
2. Copy the "Project ID"

---

## ✅ Verification

After adding all secrets, you can verify the setup by:

1. **Triggering a workflow**: Push a commit to master branch
2. **Check Actions tab**: Go to https://github.com/paivaedu632/ema/actions
3. **Monitor logs**: Ensure no "missing secret" errors

### Expected Workflow Behavior

✅ **CI Workflow** (`ci.yml`):
- Runs on every PR and push
- Validates all 66 database tests pass
- Checks code quality and build

✅ **Production Deployment** (`production-deployment.yml`):
- Runs on master branch pushes
- Deploys migrations to Supabase
- Deploys frontend to Vercel (if configured)

---

## 🔧 Troubleshooting

### Common Issues

**"Secret not found" errors**:
- Verify secret names match exactly (case-sensitive)
- Check that secrets are added to the correct repository
- Ensure you have admin access to the repository

**Supabase deployment fails**:
- Verify `SUPABASE_ACCESS_TOKEN` has correct permissions
- Check that `SUPABASE_PROJECT_REF` matches your project
- Ensure you have access to the Supabase project

**Vercel deployment fails**:
- Verify Vercel token has deployment permissions
- Check that project ID and org ID are correct
- Ensure Vercel project is properly configured

### Testing Secrets Locally

You can test the secrets configuration by running:

```bash
# Test Supabase connection
node scripts/test-remote-database.js

# Test production deployment verification
node scripts/verify-production-deployment.js
```

---

## 🎯 Next Steps

Once all secrets are configured:

1. **Create a test PR** to verify CI workflow
2. **Merge to master** to test production deployment
3. **Monitor Actions** for any issues
4. **Verify production** using verification scripts

The EmaPay order book system will then have full automated testing and deployment capabilities! 🚀
