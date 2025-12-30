# Verify Wix OAuth Setup - Step by Step

## Quick Check: Is Your Redirect URI Registered?

The blank page usually means Wix doesn't recognize your redirect URI. Let's verify:

### Step 1: Check Wix Dev Center

1. **Go to:** https://dev.wix.com/
2. **Log in** with the account that owns `keepingitcute.net`
3. **Click:** "My Apps"
4. **Find your app** (with ID: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`)
5. **Click on it** to open
6. **Click:** "OAuth" in the left sidebar
7. **Scroll down** to "Redirect URIs" section

### Step 2: What to Look For

**✅ GOOD:** You should see this URL in the list:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**❌ BAD:** If you DON'T see it, or see a different URL:
- Click **"Add Redirect URI"**
- Enter: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
- Click **"Save"** or **"Add"**

### Step 3: Verify It's Exact

The redirect URI in Wix **MUST MATCH EXACTLY** what's in your URL:
- ✅ `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
- ❌ `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback/` (trailing slash)
- ❌ `http://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` (http not https)
- ❌ `https://wix-keeping-it-cute-app.vercel.app/api/wix-oauth-callback` (wrong path)

---

## Common Issue: Redirect URI Not Added

**If the redirect URI is NOT in Wix Dev Center:**

1. **Wix will reject the OAuth request silently**
2. **You'll see a blank page** instead of the login screen
3. **No error message** (this is Wix's behavior)

**Fix:**
1. Add the redirect URI to Wix Dev Center
2. Wait a few seconds for it to propagate
3. Try logging in again

---

## Alternative: Check Browser Console

1. **Open Developer Tools** (Press F12)
2. **Go to Console tab**
3. **Try the OAuth login again**
4. **Look for errors** - they might give clues

Common errors you might see:
- `redirect_uri_mismatch`
- `invalid_client`
- `unauthorized_client`

---

## Test: Manually Log Into Wix First

Sometimes Wix needs you to be logged in first:

1. **Open a new tab**
2. **Go to:** https://www.wix.com/
3. **Log in** with your Wix account
4. **Come back** and try the OAuth login again

---

## Still Blank? Check These:

- [ ] Redirect URI added in Wix Dev Center
- [ ] Redirect URI matches EXACTLY (no trailing slash, correct https)
- [ ] Client ID matches: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
- [ ] Tried logging into wix.com first, then OAuth
- [ ] Checked browser console for errors
- [ ] Tried different browser
- [ ] Cleared browser cache

---

## If Still Not Working

The issue is almost certainly in Wix Dev Center configuration. Double-check:
1. The redirect URI is saved
2. The app is published or in development mode
3. OAuth is enabled for the app
4. You're using the correct Wix account (the one that owns the site)

