# Login Troubleshooting Guide

## Summary of Investigation

Your app has login functionality implemented using **Supabase Authentication** (email/password). After reviewing the code and your screenshot, here are the findings:

## Current Login System

### Authentication Method
- **Location**: `/pages/login.js`
- **Method**: Supabase Email/Password authentication
- **Required Fields**: Email and Password

### Code Flow
1. User enters email and password
2. App calls `supabase.auth.signInWithPassword()`
3. On success, fetches user profile to check role
4. Redirects to `/dashboard` (admin) or `/staff` (regular user)

## Potential Issues Identified

### 1. Missing Environment Variables

**If you see an error about missing Supabase variables:**

You need to configure these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### For Local Development:
1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials from https://supabase.com/dashboard
3. Restart the dev server (`npm run dev`)

#### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the variables above
4. Redeploy your application

### 2. No User Account Exists

**If login fails with "Invalid login credentials":**

You need to create a user account first:

**Option A: Using Signup Page**
1. Go to `/signup`
2. Enter email and password
3. Create account
4. Then login at `/login`

**Option B: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Authentication → Users
4. Click "Add user"
5. Enter email and password
6. **Important**: Toggle off "Email confirmation" for testing

### 3. Password Field Not Visible

**If you only see the Email field:**

This could be caused by:
- Browser autofill interfering with the form
- JavaScript errors preventing render
- CSS issues hiding the field

**To diagnose:**
1. Open browser DevTools (F12)
2. Check the Console tab for errors
3. Check the Elements/Inspector tab to see if password field exists in DOM
4. Try in a different browser or incognito mode

### 4. Supabase Configuration Issues

**If you get connection errors:**

Check your Supabase project:
1. Ensure project is active (not paused)
2. Check API settings match your environment variables
3. Verify anon key has correct permissions
4. Check if Row Level Security (RLS) is blocking access

## Testing Steps

### 1. Check Configuration
Visit: `http://localhost:3000/debug-login`

This page will show:
- ✅ or ❌ for environment variables
- ✅ or ❌ for Supabase client initialization
- Specific error messages if any

### 2. Test Signup Flow
1. Go to `/signup`
2. Create a test account
3. Check Supabase dashboard to verify user was created

### 3. Test Login Flow
1. Go to `/login`
2. Enter the email and password you created
3. Check browser console (F12) for any errors
4. Verify redirect to dashboard or staff page

## Code Locations

If you need to review or modify the authentication code:

- **Login Page**: `/pages/login.js` (lines 33-84)
- **Signup Page**: `/pages/signup.js` (lines 28-41)
- **Auth Library**: `/lib/auth.js` (lines 8-14)
- **Supabase Client**: `/utils/supabaseBrowserClient.js`

## Common Error Messages

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Invalid login credentials" | Wrong email/password or user doesn't exist | Create account via signup or check credentials |
| "Missing NEXT_PUBLIC_SUPABASE_URL" | Environment variables not set | Add env vars to `.env.local` or Vercel |
| "Failed to fetch" | Network issue or wrong Supabase URL | Check URL and network connection |
| "Email not confirmed" | Email confirmation required | Disable in Supabase or confirm email |

## Next Steps

1. **Visit `/debug-login`** to check your configuration
2. **Open browser console** (F12) when testing login to see errors
3. **Create a test user** via `/signup` if you haven't already
4. **Report specific error messages** so we can provide targeted fixes

## Alternative: Wix OAuth Login

Note: There's also a Wix OAuth login endpoint at `/api/wix-auth/login`, but it's not currently integrated with the login page. The current `/login` page only supports Supabase email/password authentication.

If you want to use Wix OAuth instead, that would require modifying the login page to redirect to the Wix authorization flow.
