# Fix: 400 Bad Request - Final Steps

## The Problem

Looking at your error logs, I can see the exact URL being sent:

```
https://www.wix.com/oauth/authorize?
client_id=a3afb75a-cc8e-4a53-ade4-1add1f70e72b&
redirect_uri=https%3A%2F%2Fwix-keeping-it-cute-app.vercel.app%2Fapi%2Fwix-auth%2Fcallback&
response_type=code&
scope=offline_access+wix.bookings.read_bookings+...
```

The redirect URI is: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

## Critical: This MUST Be Registered in Wix Dev Center

**The 400 error means Wix doesn't recognize this redirect URI.**

### Step 1: Verify in Wix Dev Center

1. Go to: **https://dev.wix.com/**
2. Click **"My Apps"**
3. Click your app (ID: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`)
4. Click **"OAuth"** in left sidebar
5. Scroll to **"Custom authentication (legacy)"** section
6. Look at **"Redirect URL"** field

**It MUST contain EXACTLY:**
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

### Step 2: If It's Missing or Different

1. **Clear** the "Redirect URL" field
2. **Type exactly** (no copy-paste, type it fresh):
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
3. **Verify:**
   - ✅ Starts with `https://`
   - ✅ No trailing slash
   - ✅ Path is `/api/wix-auth/callback`
   - ✅ No extra spaces
4. **Click "Save"** at the top right
5. **Wait 30 seconds**

### Step 3: Test Again

1. Clear browser cache
2. Try logging in again
3. The 400 error should be resolved

## Why This Happens

Wix validates the redirect URI on every OAuth request. If it doesn't match exactly what's registered, you get a 400 error.

## Debug Endpoint

Visit this to see what redirect URI your app is using:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/debug
```

The `resolvedRedirectUri` value should match what's in Wix Dev Center **EXACTLY**.

## Common Mistakes

- ❌ Trailing slash: `/api/wix-auth/callback/`
- ❌ Wrong protocol: `http://` instead of `https://`
- ❌ Wrong path: `/api/wix-oauth-callback` or `/api/callback`
- ❌ Case differences: `/API/wix-auth/callback`
- ❌ Extra spaces before/after URL
- ❌ Forgot to click "Save" in Wix Dev Center

## Still Not Working?

1. Double-check the redirect URI matches exactly
2. Make sure you clicked "Save" in Wix Dev Center
3. Wait 30 seconds after saving
4. Clear browser cache
5. Try in incognito/private window
6. Check browser console for additional errors

