# Fix: Redirect URI Validation Error in Wix Dev Center

## Problem

You're seeing a validation error: "Enter a valid URL that starts with https." even though your URL clearly starts with `https://`.

## Solution Steps

### Option 1: Clear and Re-enter the URL

1. **Clear the Redirect URL field** completely
2. **Type it fresh** (don't copy-paste):
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
3. **Click "Save"** button at the top right
4. Wait for it to save
5. Check if the error goes away

### Option 2: Use the "+ Add Redirect URL" Button

Instead of editing the field directly:

1. **Click the "+ Add Redirect URL" button** at the bottom of the section
2. **Enter the URL** in the new field that appears:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
3. **Click "Save"** at the top right

### Option 3: Check for Hidden Characters

1. **Select all text** in the Redirect URL field (Ctrl+A)
2. **Delete it**
3. **Type the URL fresh** (don't copy-paste):
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
4. Make sure there are:
   - ✅ No trailing spaces
   - ✅ No trailing slashes
   - ✅ No invisible characters
5. **Click "Save"**

### Option 4: Try Without the Path First

Sometimes Wix validates differently. Try:

1. **In the "App URL" field**, make sure it's:
   ```
   https://wix-keeping-it-cute-app.vercel.app
   ```
   (without the `/api/wix-auth/callback` part)

2. **In the "Redirect URL" field**, enter:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```

3. **Click "Save"**

### Option 5: Check Browser Console

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Click "Save"** in Wix Dev Center
4. **Look for JavaScript errors** that might indicate what's wrong

## What Should Work

Your configuration should be:
- **App URL**: `https://wix-keeping-it-cute-app.vercel.app`
- **Redirect URL**: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

Both fields are required (marked with *).

## After Saving

1. **Wait a few seconds** for the changes to propagate
2. **Try logging in again** to see if the blank page issue is resolved
3. **Check the browser console** (F12) if it still doesn't work

## Still Not Working?

If the validation error persists:

1. **Try a different browser** (Chrome, Firefox, Edge)
2. **Clear your browser cache** and try again
3. **Contact Wix Support** - this might be a bug in their UI
4. **Take a screenshot** of the error for support

## Important Notes

- The "Custom authentication (legacy)" section IS the correct place for your OAuth flow
- Your app uses the Authorization Code flow, which requires these redirect URLs
- Make sure to click "Save" after making changes
- Changes may take a few seconds to propagate

