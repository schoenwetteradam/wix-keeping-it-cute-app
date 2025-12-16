# Complete Wix OAuth Setup Guide for keepingitcute.net

This guide will walk you through setting up Wix OAuth authentication correctly to fix the 400 Bad Request error.

## 🔴 Common Issue: 400 Bad Request

The 400 error typically occurs when:
1. **Redirect URI mismatch** - The redirect URI in Wix doesn't match your app
2. **Missing environment variables** - Client ID or Secret not configured
3. **Incorrect callback path** - Mismatch between what's configured and what's used

## ✅ Step 1: Configure Wix OAuth App

### 1.1 Go to Wix Developers Dashboard

1. Visit: https://dev.wix.com/
2. Log in with your Wix account (the one that owns keepingitcute.net)
3. Click on **My Apps** in the top menu

### 1.2 Create or Find Your OAuth App

**If you already have an app:**
- Click on your app name
- Go to **OAuth** in the left sidebar

**If you need to create a new app:**
1. Click **Create App**
2. Choose **Start from scratch**
3. Enter app name: "Keeping It Cute Salon Management"
4. Click **Create**
5. Go to **OAuth** in the left sidebar

### 1.3 Configure Redirect URIs

**This is CRITICAL - must match exactly!**

Add these redirect URIs (replace with your actual domain):

**For Production (Vercel):**
```
https://your-app.vercel.app/api/wix-auth/callback
https://keepingitcute.net/api/wix-auth/callback
```

**For Local Development:**
```
http://localhost:3000/api/wix-auth/callback
```

**Important Notes:**
- ✅ URIs must match EXACTLY (including `/api/wix-auth/callback`)
- ✅ No trailing slashes
- ✅ Use `https://` in production, `http://` for localhost
- ✅ If using a custom domain, add both the Vercel URL and custom domain

### 1.4 Copy Your Client ID and Secret

1. In the OAuth page, you'll see:
   - **App ID (Client ID)** - Copy this
   - **App Secret (Client Secret)** - Click **Show** and copy this

2. **Save these securely** - You'll need them for environment variables

## ✅ Step 2: Configure Environment Variables

### 2.1 Local Development (.env.local)

Create or update `.env.local` in your project root:

```env
# Wix OAuth Configuration
NEXT_PUBLIC_WIX_CLIENT_ID=your-client-id-here
WIX_CLIENT_ID=your-client-id-here
WIX_CLIENT_SECRET=your-client-secret-here

# Redirect URI (should match what's in Wix)
NEXT_PUBLIC_WIX_REDIRECT_URI=https://your-production-domain.com/api/wix-auth/callback
WIX_REDIRECT_URI=https://your-production-domain.com/api/wix-auth/callback

# For local development, use:
# NEXT_PUBLIC_WIX_REDIRECT_URI=http://localhost:3000/api/wix-auth/callback
# WIX_REDIRECT_URI=http://localhost:3000/api/wix-auth/callback

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Allowed Staff Domains
NEXT_PUBLIC_ALLOWED_STAFF_DOMAINS=keepingitcute.com,wix.com
ALLOWED_STAFF_DOMAINS=keepingitcute.com,wix.com
```

### 2.2 Vercel Production Environment Variables

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:

**Required Variables:**
```
NEXT_PUBLIC_WIX_CLIENT_ID = your-client-id
WIX_CLIENT_ID = your-client-id
WIX_CLIENT_SECRET = your-client-secret
NEXT_PUBLIC_WIX_REDIRECT_URI = https://your-production-domain.com/api/wix-auth/callback
WIX_REDIRECT_URI = https://your-production-domain.com/api/wix-auth/callback
NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
NEXT_PUBLIC_ALLOWED_STAFF_DOMAINS = keepingitcute.com,wix.com
ALLOWED_STAFF_DOMAINS = keepingitcute.com,wix.com
```

4. **Important:** For each variable, select:
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)

5. Click **Save**
6. **Redeploy** your app after adding variables

## ✅ Step 3: Configure Supabase Database

### 3.1 Create wix_auth_sessions Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create wix_auth_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS wix_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  wix_member_id TEXT,
  wix_contact_id TEXT,
  wix_member_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wix_auth_sessions_user_id ON wix_auth_sessions(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_wix_auth_sessions_active ON wix_auth_sessions(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE wix_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy (adjust based on your security needs)
CREATE POLICY "Users can view their own sessions"
  ON wix_auth_sessions FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Service role can manage all sessions"
  ON wix_auth_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.2 Verify Supabase Auth is Enabled

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Ensure **Email Auth** is enabled
3. Configure **Site URL** if needed:
   - Production: `https://your-production-domain.com`
   - Local: `http://localhost:3000`

## ✅ Step 4: Verify Your Setup

### 4.1 Check Redirect URI Consistency

**In Wix Dashboard:**
- Redirect URI: `https://your-domain.com/api/wix-auth/callback`

**In Your Code (now fixed):**
- Login handler uses: `/api/wix-auth/callback`
- Callback handler exists at: `pages/api/wix-auth/callback.js`

**In Environment Variables:**
- `NEXT_PUBLIC_WIX_REDIRECT_URI` = `https://your-domain.com/api/wix-auth/callback`
- `WIX_REDIRECT_URI` = `https://your-domain.com/api/wix-auth/callback`

### 4.2 Test the Flow

1. **Start local dev server:**
   ```bash
   npm run dev
   ```

2. **Visit:** `http://localhost:3000/login`

3. **Click "Login with Wix Staff Account"**

4. **Expected flow:**
   - Redirects to Wix OAuth page
   - You authorize the app
   - Redirects back to `/api/wix-auth/callback`
   - Should redirect to `/staff` on success

## 🐛 Troubleshooting

### Error: "400 Bad Request" from Wix

**Possible causes:**
1. Redirect URI mismatch
   - Check Wix dashboard redirect URIs
   - Check environment variables
   - Ensure no trailing slashes

2. Invalid Client ID/Secret
   - Verify in Wix dashboard
   - Check environment variables are set
   - Ensure no extra spaces or quotes

3. Code already used or expired
   - Try the login flow again (codes are single-use)

### Error: "Missing authorization code"

- The callback is being hit without a code
- Check that redirect URI in Wix matches exactly
- Verify the callback URL is accessible

### Error: "Failed to exchange code"

- Check `WIX_CLIENT_SECRET` is correct
- Verify redirect URI matches in both places
- Check server logs for detailed error

### Session not persisting

- Check Supabase `wix_auth_sessions` table exists
- Verify RLS policies allow your user
- Check cookies are being set (browser dev tools)

## 📋 Checklist

Before testing, verify:

- [ ] Wix OAuth app created
- [ ] Redirect URI added in Wix (matches `/api/wix-auth/callback`)
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Environment variables set (local and Vercel)
- [ ] Redirect URI env vars match Wix configuration
- [ ] Supabase `wix_auth_sessions` table created
- [ ] Supabase RLS policies configured
- [ ] App redeployed on Vercel after env var changes

## 🔗 Important URLs

**Wix Developers:** https://dev.wix.com/
**Wix OAuth Docs:** https://dev.wix.com/api/rest/getting-started/authentication
**Supabase Dashboard:** https://app.supabase.com/
**Vercel Dashboard:** https://vercel.com/dashboard

---

**Need Help?** Check server logs and browser console for detailed error messages. The error message usually indicates what's missing or mismatched.

