# Fix: Main Page 400 Bad Request Error

## Problem

When accessing the main page of the app, you're getting a 400 Bad Request error from Wix and seeing the Wix marketing page.

## Root Cause

The error occurs because:

1. The app tries to check Wix authentication status on every page load
2. When authentication status check fails, it may trigger redirects or errors
3. The status check API (`/api/wix-auth/status`) might be making invalid Wix API calls
4. Wix returns a 400 error if the OAuth configuration is invalid or redirect URI doesn't match

## Solution Applied

### 1. Improved Error Handling in `useWixAuth` Hook

- Made status checks non-blocking and non-critical
- Status check failures no longer throw errors that break the app
- Added proper session validation before making API calls

### 2. Updated Login Page

- Added delay before status check to ensure component is mounted
- Status check errors are handled silently
- Login page no longer depends on status check to function

### 3. Updated App-Level Auth Enforcement

- Added `/mobile` to open routes (mobile app doesn't need staff auth)
- Better error handling to prevent redirect loops
- Added delay to avoid race conditions

## Additional Troubleshooting Steps

If you still see the 400 error, check:

### 1. Wix OAuth Configuration

Verify these environment variables are set correctly in Vercel:

- `NEXT_PUBLIC_WIX_CLIENT_ID` - Your Wix App ID
- `WIX_CLIENT_SECRET` - Your Wix App Secret
- `WIX_REDIRECT_URI` or `NEXT_PUBLIC_WIX_REDIRECT_URI` - Must match Wix Dev Center settings

### 2. Wix Dev Center Settings

1. Go to [Wix Dev Center](https://dev.wix.com/)
2. Select your app
3. Go to OAuth Settings
4. Ensure these redirect URIs are added:
   - `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
   - `https://wix-keeping-it-cute-app.vercel.app/api/wix-oauth-callback` (if using legacy endpoint)

### 3. Check Browser Console

Open browser DevTools (F12) and check:
- Network tab: Look for failed requests to `/api/wix-auth/status`
- Console tab: Look for error messages

### 4. Test Direct Access

Try accessing these URLs directly:
- `/login` - Should show login page without errors
- `/mobile` - Should show mobile app (if implemented)
- `/staff` - Should redirect to login if not authenticated

### 5. Clear Browser Cache

Sometimes cached redirects can cause issues:
1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Hard refresh (Ctrl+F5 or Cmd+Shift+R)

## Expected Behavior After Fix

1. Main page (`/`) redirects to `/staff` or `/login` without errors
2. Login page loads without attempting Wix status check on first render
3. Status checks only happen when user has a valid session
4. Errors in status checks don't break the app flow

## Still Having Issues?

If the problem persists:

1. Check Vercel logs for server-side errors
2. Verify all environment variables are set in Vercel dashboard
3. Ensure Wix app is properly configured in Wix Dev Center
4. Try accessing the app in a different browser or device



