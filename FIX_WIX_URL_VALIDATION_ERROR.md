# Fix: Wix Redirect URL Validation Error

## 🔴 The Issue

Wix is showing: "Enter a valid URL that starts with https."

Even though your URL `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` does start with https!

## ✅ Solution Steps

### Option 1: Use the "Add Redirect URL" Button

1. **Click the "+ Add Redirect URL" link** below the current field
2. In the NEW field that appears, enter:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
3. Keep your existing redirect URL (if you have `https://www.keepingitcute.net/api/wix-auth/callback`)
4. Click **Save**

### Option 2: Clear and Re-enter

1. **Clear the current Redirect URL field** completely
2. **Click "+ Add Redirect URL"** to add a fresh one
3. Enter:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
4. Click **Save**

### Option 3: Check for Hidden Characters

Sometimes copy/paste can introduce invisible characters:

1. Select all text in the field (Ctrl+A / Cmd+A)
2. Delete it
3. Type the URL manually:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
4. Make sure there are NO spaces before or after
5. Click **Save**

## 📋 Make Sure You Have All Required URLs

You should have these redirect URLs configured:

1. **Vercel deployment:**
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```

2. **Custom domain (if you use it):**
   ```
   https://www.keepingitcute.net/api/wix-auth/callback
   ```

3. **Local development:**
   ```
   http://localhost:3000/api/wix-auth/callback
   ```

## ⚠️ Important Notes

- The URL must start with `https://` (except localhost which uses `http://`)
- No trailing slash at the end
- No spaces or special characters
- The path must be exactly `/api/wix-auth/callback`

After saving, wait 10-30 seconds for Wix to process the changes, then try logging in again!

