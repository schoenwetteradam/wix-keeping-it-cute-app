# Wix OAuth Methods Explained

## Two OAuth Methods

Based on Wix documentation, there are **two different OAuth methods**:

### 1. OAuth (Recommended) - Client Credentials Flow
- **Endpoint**: `https://www.wixapis.com/oauth2/token`
- **Grant Type**: `client_credentials`
- **What you need**: App ID, App Secret, App Instance ID
- **No redirects required** - Just call the API directly
- **Simpler** - No user interaction, no redirect handling
- **Best for**: Server-to-server API calls, background jobs

### 2. Custom Authentication (Legacy) - Authorization Code Flow
- **Endpoint**: `https://www.wixapis.com/oauth/access`
- **Grant Type**: `authorization_code`
- **What you need**: App ID, App Secret, Authorization Code (from redirect)
- **Requires redirects** - User must authorize via browser
- **More complex** - Need to handle redirects, store refresh tokens
- **Best for**: User login flows, when you need user consent

## Your Current Implementation

Looking at your code, you're currently using **Custom Authentication (Legacy)** - the Authorization Code flow:

1. ✅ Your code redirects to: `https://www.wix.com/oauth/authorize`
2. ✅ Your callback receives an authorization code
3. ✅ You exchange the code for tokens using: `https://www.wixapis.com/oauth/access`

**This means you're in the CORRECT section** in Wix Dev Center (Custom authentication/legacy).

## Why You're Using Authorization Code Flow

You're using this flow because you want **users to log in** with their Wix credentials. This requires:
- User interaction (clicking "Login with Wix")
- User consent (authorizing your app)
- Redirects to handle the flow

The simpler Client Credentials flow wouldn't work for user login - it's only for app-level authentication.

## Your Configuration is Correct

Your Wix Dev Center configuration should have:

**In "Custom authentication (legacy)" section:**
- **App URL**: `https://wix-keeping-it-cute-app.vercel.app`
- **Redirect URL**: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

This is exactly what you need for the Authorization Code flow!

## About the Validation Error

The validation error you're seeing ("Enter a valid URL that starts with https") is likely a UI bug in Wix Dev Center. Your URL is correct. Try:

1. Clear the field and retype it
2. Click "Save" at the top
3. Wait a few seconds
4. The error should disappear

## When to Use Each Method

### Use OAuth (Client Credentials) if:
- ❌ You DON'T need user login
- ✅ You just need to call APIs from your server
- ✅ You have the App Instance ID
- ✅ You want simpler implementation

### Use Custom Authentication (Authorization Code) if:
- ✅ You NEED user login (like your app)
- ✅ Users must authorize/consent
- ✅ You need to identify which user is using your app
- ✅ You need redirect-based authentication

## Your App's Use Case

Since your app has a **login button** that says "Login with Wix Staff Account", you **must** use Custom Authentication (Authorization Code flow). This is the correct choice!

## Summary

- ✅ You're using the right OAuth method for user login
- ✅ You're configuring it in the right place (Custom authentication)
- ✅ Your URLs are correct
- ⚠️ The validation error is likely a UI bug - try saving again
- ✅ Once saved, your OAuth flow should work

## Next Steps

1. Make sure both URLs are saved in Wix Dev Center
2. Click "Save" at the top of the page
3. Wait 10-30 seconds for changes to propagate
4. Try logging in again
5. The blank page should be resolved!

