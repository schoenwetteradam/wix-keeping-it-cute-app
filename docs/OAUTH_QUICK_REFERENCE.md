# Wix OAuth Quick Reference

## What You Need

### From Wix Dev Center (https://dev.wix.com/)

1. **App ID (Client ID)** - Found in: OAuth → App ID
2. **App Secret (Client Secret)** - Found in: OAuth → App Secret (click "Show")
3. **Redirect URI** - Must add in: OAuth → Redirect URIs

### Redirect URI Must Be:

**Production:**
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**Local Development:**
```
http://localhost:3000/api/wix-auth/callback
```

### Environment Variables Needed:

**In Vercel (Settings → Environment Variables):**

```
NEXT_PUBLIC_WIX_CLIENT_ID = your-app-id
WIX_CLIENT_ID = your-app-id
WIX_CLIENT_SECRET = your-app-secret
NEXT_PUBLIC_WIX_REDIRECT_URI = https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
WIX_REDIRECT_URI = https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**In .env.local (for local dev):**

```
NEXT_PUBLIC_WIX_CLIENT_ID = your-app-id
WIX_CLIENT_ID = your-app-id
WIX_CLIENT_SECRET = your-app-secret
NEXT_PUBLIC_WIX_REDIRECT_URI = http://localhost:3000/api/wix-auth/callback
WIX_REDIRECT_URI = http://localhost:3000/api/wix-auth/callback
```

## Critical: Redirect URI Must Match EXACTLY

✅ **Correct:**
- `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

❌ **Wrong:**
- `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback/` (trailing slash)
- `https://wix-keeping-it-cute-app.vercel.app/api/wix-oauth-callback` (wrong path)
- `http://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` (http vs https)

## Quick Checklist

- [ ] App created in Wix Dev Center
- [ ] Redirect URI added in Wix (matches exactly)
- [ ] App ID copied
- [ ] App Secret copied
- [ ] Env vars set in Vercel (Production)
- [ ] Env vars set in .env.local (if testing locally)
- [ ] App redeployed after adding env vars
- [ ] Supabase `wix_auth_sessions` table exists

## How OAuth Works (Simple)

1. User clicks "Login" → Redirects to Wix
2. User logs in with Wix → Authorizes your app
3. Wix redirects back with code → Your app exchanges for tokens
4. Tokens stored in Supabase → User authenticated ✅


