# Complete Wix OAuth Setup Guide

## 🔐 How OAuth Works in Your App

**Yes, you're correct!** OAuth allows users to sign into your Next.js app (hosted on GitHub/Vercel) using their Wix credentials. Here's how it works:

### The OAuth Flow:

1. **User clicks "Login with Wix"** on your app
2. **Your app redirects** to Wix's authorization page (`https://www.wix.com/oauth/authorize`)
3. **User logs in** with their Wix account and authorizes your app
4. **Wix redirects back** to your app with an authorization code
5. **Your app exchanges** the code for access tokens (access_token + refresh_token)
6. **Your app stores** the tokens in Supabase database
7. **User is authenticated** and can use the app

This is called **OAuth 2.0 Authorization Code Flow** - the standard way to authenticate users.

---

## 📋 Step-by-Step: Configure Your Wix App in Dev Center

### Step 1: Go to Wix Developers Dashboard

1. Visit: **https://dev.wix.com/**
2. Log in with the Wix account that owns `keepingitcute.net`
3. Click **"My Apps"** in the top menu

### Step 2: Create or Select Your OAuth App

**Option A: If you already have an app:**
- Click on your app name
- Skip to Step 3

**Option B: Create a new app:**
1. Click **"Create App"** (blue button)
2. Choose **"Start from scratch"**
3. Enter app name: **"Keeping It Cute Salon Management"**
4. Click **"Create"**

### Step 3: Go to OAuth Settings

1. In the left sidebar, click **"OAuth"**
2. You'll see:
   - **App ID (Client ID)** - Copy this! ⬅️ You'll need this
   - **App Secret (Client Secret)** - Click "Show" and copy this! ⬅️ Keep this secret!

### Step 4: Configure Redirect URIs (CRITICAL!)

This is the most important step and where most errors occur!

1. Scroll down to **"Redirect URIs"** section
2. Click **"Add Redirect URI"**
3. Add these URIs **EXACTLY** as shown (replace with your actual domain):

**For Production (Vercel):**
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**If you have a custom domain:**
```
https://keepingitcute.net/api/wix-auth/callback
```

**For Local Development:**
```
http://localhost:3000/api/wix-auth/callback
```

**⚠️ CRITICAL NOTES:**
- ✅ Must match **EXACTLY** (case-sensitive, including the path `/api/wix-auth/callback`)
- ✅ No trailing slashes
- ✅ Use `https://` for production, `http://` for localhost
- ✅ The path must be `/api/wix-auth/callback` (not `/api/wix-oauth-callback`)

### Step 5: Configure OAuth Scopes (Optional)

Your app already requests these scopes in the code. In Wix Dev Center, you typically don't need to configure scopes separately - they're requested when the user authorizes. However, make sure your app has permission to:

- Read/Write Bookings
- Read/Write Contacts
- Read/Write Orders
- Read/Write Products
- etc.

These are typically granted automatically when you create an OAuth app.

### Step 6: Save Your Credentials

1. Copy your **App ID (Client ID)** - looks like: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
2. Copy your **App Secret (Client Secret)** - looks like: `abc123...` (long random string)
3. **Save these securely** - you'll need them for environment variables

---

## 🔧 Step-by-Step: Configure Environment Variables

### For Vercel (Production)

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project: **wix-keeping-it-cute-app**
3. Click **Settings** → **Environment Variables**
4. Add these variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_WIX_CLIENT_ID` | `your-app-id-here` | Your Wix App ID (Client ID) |
| `WIX_CLIENT_ID` | `your-app-id-here` | Same as above (for server-side) |
| `WIX_CLIENT_SECRET` | `your-app-secret-here` | Your Wix App Secret (keep secret!) |
| `NEXT_PUBLIC_WIX_REDIRECT_URI` | `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` | Must match Wix Dev Center |
| `WIX_REDIRECT_URI` | `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` | Same as above (server-side) |

5. For each variable:
   - ✅ Check **Production**
   - ✅ Check **Preview** (optional)
   - ✅ Check **Development** (optional)
6. Click **Save**
7. **IMPORTANT:** Redeploy your app after adding variables:
   - Go to **Deployments** tab
   - Click the **3 dots** on the latest deployment
   - Click **Redeploy**

### For Local Development (.env.local)

Create or edit `.env.local` in your project root:

```env
# Wix OAuth Configuration
NEXT_PUBLIC_WIX_CLIENT_ID=your-app-id-here
WIX_CLIENT_ID=your-app-id-here
WIX_CLIENT_SECRET=your-app-secret-here

# Redirect URIs
NEXT_PUBLIC_WIX_REDIRECT_URI=http://localhost:3000/api/wix-auth/callback
WIX_REDIRECT_URI=http://localhost:3000/api/wix-auth/callback

# Supabase Configuration (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Allowed Staff Domains
NEXT_PUBLIC_ALLOWED_STAFF_DOMAINS=keepingitcute.com,wix.com
ALLOWED_STAFF_DOMAINS=keepingitcute.com,wix.com
```

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] **Wix App Created** in Wix Dev Center
- [ ] **App ID (Client ID)** copied
- [ ] **App Secret (Client Secret)** copied
- [ ] **Redirect URI added** in Wix Dev Center:
  - [ ] `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
  - [ ] (Optional) `http://localhost:3000/api/wix-auth/callback` for local dev
- [ ] **Environment variables set** in Vercel:
  - [ ] `NEXT_PUBLIC_WIX_CLIENT_ID`
  - [ ] `WIX_CLIENT_ID`
  - [ ] `WIX_CLIENT_SECRET`
  - [ ] `NEXT_PUBLIC_WIX_REDIRECT_URI`
  - [ ] `WIX_REDIRECT_URI`
- [ ] **Environment variables match** between Wix Dev Center and Vercel
- [ ] **App redeployed** on Vercel after adding env vars
- [ ] **Supabase `wix_auth_sessions` table** exists (from migration)

---

## 🧪 Testing the OAuth Flow

### Test in Production (Vercel)

1. Go to: `https://wix-keeping-it-cute-app.vercel.app/login`
2. Click **"Login with Wix Staff Account"**
3. You should be redirected to Wix's login page
4. Log in with a Wix account that has access to `keepingitcute.net`
5. Authorize the app
6. You should be redirected back to `/staff` dashboard

### Test Locally

1. Make sure `.env.local` is configured
2. Start dev server: `npm run dev`
3. Go to: `http://localhost:3000/login`
4. Follow the same steps as above

---

## 🐛 Common Issues & Solutions

### Issue: "400 Bad Request" from Wix

**Cause:** Redirect URI mismatch

**Solution:**
1. Check Wix Dev Center → OAuth → Redirect URIs
2. Check Vercel environment variables
3. Ensure they match **EXACTLY** (including `/api/wix-auth/callback`)
4. No trailing slashes
5. Use `https://` for production

### Issue: "Missing authorization code"

**Cause:** Callback URL not configured correctly

**Solution:**
- Verify redirect URI in Wix matches your callback path
- Check that the callback endpoint exists: `/api/wix-auth/callback`

### Issue: "Failed to exchange code"

**Cause:** Invalid client secret or redirect URI mismatch

**Solution:**
1. Double-check `WIX_CLIENT_SECRET` in Vercel
2. Ensure redirect URI matches in both places
3. Make sure you're using the correct App Secret (not an API token)

### Issue: Redirect URI doesn't match

**Error message:** "redirect_uri_mismatch"

**Solution:**
- The redirect URI in your Wix app settings must **exactly match** what you're sending
- Check for:
  - `http://` vs `https://`
  - Trailing slashes
  - Case sensitivity
  - Path: `/api/wix-auth/callback`

---

## 📊 How It All Works Together

```
┌─────────────┐
│   User      │
│  Clicks     │
│  "Login"    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Your Next.js App               │
│  /api/wix-auth/login            │
│  - Generates OAuth URL          │
│  - Redirects to Wix             │
└──────┬──────────────────────────┘
       │ Redirects to:
       ▼
┌─────────────────────────────────┐
│  Wix OAuth Server               │
│  https://www.wix.com/oauth/     │
│  authorize                      │
│  - User logs in                 │
│  - User authorizes app          │
└──────┬──────────────────────────┘
       │ Redirects back with code:
       ▼
┌─────────────────────────────────┐
│  Your Next.js App               │
│  /api/wix-auth/callback         │
│  - Receives code                │
│  - Exchanges for tokens         │
│  - Stores in Supabase           │
│  - Redirects to /staff          │
└─────────────────────────────────┘
```

---

## 🔑 Key Points

1. **OAuth allows** users to sign in with Wix credentials
2. **Wix Dev Center** needs:
   - Redirect URI configured: `/api/wix-auth/callback`
   - App ID (Client ID)
   - App Secret (Client Secret)
3. **Your app needs**:
   - Environment variables set (Client ID, Secret, Redirect URI)
   - Supabase database with `wix_auth_sessions` table
   - Matching redirect URIs between Wix and your app

4. **Most common error:** Redirect URI mismatch - must match EXACTLY!

---

## 📞 Need More Help?

1. Check browser console (F12) for errors
2. Check Vercel logs for server-side errors
3. Verify all environment variables are set correctly
4. Ensure redirect URIs match exactly
5. Make sure app is redeployed after env var changes


