# Fix: Blank Page on Wix OAuth Login

## Problem
When clicking "Login with Wix", you're redirected to a Wix OAuth URL but see a **blank white page** instead of the login/authorization screen.

## Common Causes

1. **Redirect URI not registered** in Wix Dev Center
2. **App not properly configured** in Wix Dev Center
3. **Incorrect client_id** or app setup
4. **Need to log into Wix first** with the correct account
5. **App permissions** not configured correctly

---

## ✅ Step-by-Step Fix

### Step 1: Verify Your App in Wix Dev Center

1. Go to: **https://dev.wix.com/**
2. Log in with the account that owns `keepingitcute.net`
3. Click **"My Apps"** in the top menu
4. Find or create your app with ID: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`

### Step 2: Check OAuth Settings

1. Click on your app
2. Go to **"OAuth"** in the left sidebar
3. Verify you see:
   - **App ID (Client ID)**: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b` ✅
   - **App Secret (Client Secret)**: Should be visible

### Step 3: Add Redirect URI (CRITICAL!)

1. Scroll down to **"Redirect URIs"** section
2. Click **"Add Redirect URI"** button
3. Add this EXACT URL (no trailing slash):
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
4. Click **"Save"** or **"Add"**

**⚠️ IMPORTANT:**
- Must be **EXACTLY** this URL
- No trailing slash
- Use `https://` (not `http://`)
- Path must be `/api/wix-auth/callback`

### Step 4: Verify App Status

Make sure your app is:
- ✅ **Published** or at least in **Development** mode
- ✅ Has **OAuth enabled**
- ✅ The app is associated with your Wix site (`keepingitcute.net`)

### Step 5: Try Different Approaches

#### Option A: Try Opening in Incognito/Private Window
1. Open an **Incognito/Private** browser window
2. First, manually log into: **https://www.wix.com/**
3. Then try the OAuth flow again

#### Option B: Check Browser Console
1. Open browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Try the OAuth login again
4. Look for any JavaScript errors

#### Option C: Check Network Tab
1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Try the OAuth login again
4. Look for any failed requests (red)
5. Click on failed requests to see error details

---

## 🔍 Debugging Steps

### 1. Verify Redirect URI in URL

The URL you shared shows:
```
redirect_uri=https%3A%2F%2Fwix-keeping-it-cute-app.vercel.app%2Fapi%2Fwix-auth%2Fcallback
```

This decodes to:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**This MUST be registered in Wix Dev Center!**

### 2. Test if Redirect URI is Registered

1. Go to Wix Dev Center → Your App → OAuth
2. Look at the **Redirect URIs** list
3. Is `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` in the list?
   - ✅ **Yes**: Continue to Step 3
   - ❌ **No**: Add it now!

### 3. Verify Client ID Matches

In the OAuth URL:
- Client ID: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`

In Wix Dev Center:
- App ID (Client ID): Should be `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`

**These must match!**

### 4. Check if You're Logged Into Wix

1. Open a new tab
2. Go to: **https://www.wix.com/**
3. If you're not logged in, log in first
4. Then try the OAuth flow again

---

## 🐛 Alternative: Try Test URL

If the redirect URI is correctly configured, try accessing the OAuth URL directly:

1. Open: **https://www.wix.com/oauth/authorize?client_id=a3afb75a-cc8e-4a53-ade4-1add1f70e72b&redirect_uri=https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback&response_type=code&scope=offline_access**

This is a simplified version with minimal scopes. If this works, the issue might be with the scopes.

---

## 🔄 If Still Not Working: Recreate the App

Sometimes Wix apps can have configuration issues. Try:

1. **Create a new OAuth app** in Wix Dev Center
2. **Copy the new App ID and Secret**
3. **Add the redirect URI** to the new app
4. **Update environment variables** in Vercel with new credentials
5. **Redeploy** your app

---

## ✅ Quick Checklist

- [ ] Logged into Wix Dev Center with correct account
- [ ] App exists with ID: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
- [ ] Redirect URI added: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
- [ ] No trailing slash on redirect URI
- [ ] Using `https://` (not `http://`)
- [ ] Client ID matches in both places
- [ ] Environment variables set in Vercel
- [ ] App redeployed after env var changes
- [ ] Tried logging into wix.com first, then OAuth
- [ ] Checked browser console for errors

---

## 📞 Still Having Issues?

1. **Check Wix Dev Center** for any error messages
2. **Check browser console** (F12) for JavaScript errors
3. **Check network tab** for failed HTTP requests
4. **Try a different browser** (Chrome, Firefox, Edge)
5. **Clear browser cache** and try again
6. **Verify** you're using the account that owns the Wix site

---

## 🔗 Important URLs

- **Wix Dev Center**: https://dev.wix.com/
- **Your App OAuth Settings**: https://dev.wix.com/ → My Apps → [Your App] → OAuth
- **Wix Login**: https://www.wix.com/
- **Your Vercel Project**: https://vercel.com/dashboard

