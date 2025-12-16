# Fix: Redirect URI Mismatch - 400 Bad Request

## 🔴 The Problem

Your app is sending: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
But Wix only has: `https://www.keepingitcute.net/api/wix-auth/callback`

**Wix OAuth requires an EXACT match** - so it rejects the request with 400.

## ✅ Solution: Add Vercel URL to Wix OAuth Settings

### Step 1: Go to Wix Developers Dashboard

1. Visit: https://dev.wix.com/
2. Log in
3. Click **My Apps**
4. Click on your app
5. Go to **OAuth** in the left sidebar

### Step 2: Add Redirect URIs

In the **Redirect URIs** section, you need BOTH:

```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
https://www.keepingitcute.net/api/wix-auth/callback
```

**For local development, also add:**
```
http://localhost:3000/api/wix-auth/callback
```

### Step 3: Save and Test

1. Click **Save** in Wix
2. Wait a few seconds for changes to propagate
3. Try logging in again

---

## 🔄 Alternative Solution: Remove Environment Variables

If you want the app to always use the current domain dynamically (recommended), you can remove the redirect URI environment variables:

**In Vercel Environment Variables, REMOVE:**
- `NEXT_PUBLIC_WIX_REDIRECT_URI`
- `WIX_REDIRECT_URI`

Then the app will automatically use whatever domain it's running on. But you'll still need to add all possible domains to Wix.

---

## ✅ Recommended: Use Both Approaches

1. **Keep env vars** for your custom domain (`keepingitcute.net`)
2. **Add ALL domains** to Wix OAuth settings:
   - Vercel URL (for automatic deployments)
   - Custom domain (for production)
   - Localhost (for development)

This way it works everywhere!

---

## 📋 Quick Checklist

- [ ] Added `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback` to Wix
- [ ] Added `https://www.keepingitcute.net/api/wix-auth/callback` to Wix
- [ ] Added `http://localhost:3000/api/wix-auth/callback` to Wix (for dev)
- [ ] Clicked Save in Wix
- [ ] Waited 10-30 seconds for changes to propagate
- [ ] Tested login again

After adding the Vercel URL to Wix, the 400 error should be resolved!

