# Debug: 400 Bad Request from Wix OAuth

## Error
```
ERROR: BAD REQUEST
400
There's an issue with your request.
This action can't be completed.
Request ID: 1766772838.2587997126430630535
```

## Quick Diagnostic

1. **Test your configuration:**
   - Visit: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/debug`
   - This will show you what redirect URI your app is using

2. **Compare with Wix Dev Center:**
   - Go to: https://dev.wix.com/ → My Apps → [Your App] → OAuth
   - Scroll to "Custom authentication (legacy)"
   - Check the "Redirect URL" field
   - **It MUST match EXACTLY** what the debug endpoint shows

## Common Causes

### 1. Redirect URI Mismatch (Most Common)

**Problem:** The redirect URI in your OAuth request doesn't match what's configured in Wix Dev Center.

**Solution:**
1. Check what your app is sending:
   - Visit: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/debug`
   - Copy the "resolvedRedirectUri" value

2. Check what Wix Dev Center has:
   - Go to Wix Dev Center → Your App → OAuth → Custom authentication (legacy)
   - Look at "Redirect URL" field

3. They MUST match EXACTLY:
   - ✅ Correct: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
   - ❌ Wrong: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback/` (trailing slash)
   - ❌ Wrong: `http://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` (http not https)
   - ❌ Wrong: Case differences or extra spaces

### 2. Client ID Mismatch

**Problem:** The client_id in your request doesn't match your app's ID.

**Solution:**
1. Check your environment variables:
   - `NEXT_PUBLIC_WIX_CLIENT_ID` should be: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
   - `WIX_CLIENT_ID` should be the same

2. Verify in Wix Dev Center:
   - OAuth page should show the same App ID

### 3. Redirect URI Not Saved in Wix

**Problem:** You entered the redirect URI but didn't click "Save".

**Solution:**
1. Go to Wix Dev Center → Your App → OAuth
2. Scroll to "Custom authentication (legacy)"
3. Enter the redirect URI
4. **Click "Save" at the top right** (critical!)
5. Wait 30 seconds for changes to propagate

### 4. Invalid Scopes

**Problem:** The scopes requested might be invalid or not approved for your app.

**Solution:**
- Check Wix Dev Center → Permissions
- Make sure all requested scopes are listed
- Try with minimal scopes first to test

### 5. App Not Published/Active

**Problem:** Your app might not be active or published.

**Solution:**
- Check app status in Wix Dev Center
- Make sure the app is in "Development" or "Published" state

## Step-by-Step Fix

### Step 1: Get Your App's Redirect URI

Visit this debug endpoint:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/debug
```

Copy the `resolvedRedirectUri` value. It should be:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

### Step 2: Configure in Wix Dev Center

1. Go to: https://dev.wix.com/
2. Click "My Apps"
3. Click on your app
4. Click "OAuth" in left sidebar
5. Scroll to "Custom authentication (legacy)" section
6. In "Redirect URL" field, enter EXACTLY:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
7. **Click "Save" at the top right**
8. Wait 30 seconds

### Step 3: Verify Environment Variables in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify these are set:
   - `NEXT_PUBLIC_WIX_CLIENT_ID` = `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
   - `WIX_CLIENT_ID` = `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
   - `WIX_CLIENT_SECRET` = (your secret)
   - `NEXT_PUBLIC_WIX_REDIRECT_URI` = `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
   - `WIX_REDIRECT_URI` = `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

5. If you changed any, **redeploy your app**

### Step 4: Test Again

1. Clear browser cache
2. Try logging in again
3. If it still fails, check browser console (F12) for errors

## Debug Checklist

- [ ] Redirect URI matches EXACTLY in both places
- [ ] No trailing slashes
- [ ] Using `https://` (not `http://`)
- [ ] Client ID matches
- [ ] Clicked "Save" in Wix Dev Center
- [ ] Waited 30 seconds after saving
- [ ] Environment variables set correctly in Vercel
- [ ] App redeployed after env var changes
- [ ] Tried in incognito/private window
- [ ] Checked browser console for errors

## Still Not Working?

1. **Check the debug endpoint** for configuration issues
2. **Take a screenshot** of your Wix Dev Center OAuth settings
3. **Check Vercel logs** for server-side errors
4. **Check browser console** for client-side errors
5. **Try the test URL** from the debug endpoint (if provided)

## Request ID

If you need to contact Wix support, provide this Request ID:
```
1766772838.2587997126430630535
```

