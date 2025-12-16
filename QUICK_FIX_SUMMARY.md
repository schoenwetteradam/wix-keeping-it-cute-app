# Quick Fix Summary: 400 Bad Request Login Error

## ✅ What Was Fixed

1. **Redirect URI Path Mismatch** - Fixed in `pages/api/wix-auth/login.js`
   - Changed from default `/api/wix-oauth-callback` to `/api/wix-auth/callback`
   - This matches your actual callback handler location

## 🔧 What You Need to Do

### 1. Verify Wix OAuth Configuration

Go to https://dev.wix.com/ → Your App → OAuth Settings

**Make sure you have these Redirect URIs (use your actual domain):**
```
https://your-production-domain.com/api/wix-auth/callback
http://localhost:3000/api/wix-auth/callback
```

### 2. Check Environment Variables

**In Vercel (Production):**
- `NEXT_PUBLIC_WIX_CLIENT_ID` = Your Wix Client ID
- `WIX_CLIENT_ID` = Your Wix Client ID  
- `WIX_CLIENT_SECRET` = Your Wix Client Secret
- `NEXT_PUBLIC_WIX_REDIRECT_URI` = `https://your-domain.com/api/wix-auth/callback`
- `WIX_REDIRECT_URI` = `https://your-domain.com/api/wix-auth/callback`

**Important:** 
- Replace `your-domain.com` with your actual domain (e.g., `keepingitcute.net` or your Vercel app URL)
- The redirect URI must match EXACTLY what's in Wix (including the path `/api/wix-auth/callback`)

### 3. Run Supabase Migration (if not done)

Run this in Supabase SQL Editor:
```sql
-- File: migrations/20250523_add_wix_auth_sessions.sql
```

### 4. Redeploy After Changes

After updating environment variables in Vercel:
1. Go to your Vercel project
2. Click "Redeploy" → "Redeploy"

## 🧪 Test the Fix

1. Visit your login page: `https://your-domain.com/login`
2. Click "Login with Wix Staff Account"
3. Should redirect to Wix OAuth
4. After authorizing, should redirect back and work

## ❌ If Still Getting 400 Error

1. **Check browser console** for JavaScript errors
2. **Check server logs** in Vercel dashboard
3. **Verify redirect URI matches exactly** in both:
   - Wix OAuth settings
   - Your environment variables
4. **Clear browser cookies** and try again

## 📖 Full Setup Guide

See `docs/WIX_OAUTH_SETUP_COMPLETE.md` for complete step-by-step instructions.

