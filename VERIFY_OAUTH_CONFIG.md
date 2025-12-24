# Verify OAuth Configuration Checklist

## ✅ Your Wix OAuth Settings (Look Good!)

**App ID:** `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
**App Secret:** `f522403a-6acb-49ed-ba1d-441e6320cee8`
**Redirect URL:** `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

## 📋 Environment Variables to Verify in Vercel

Go to **Vercel → Your Project → Settings → Environment Variables** and ensure you have:

### Required Variables:

1. **NEXT_PUBLIC_WIX_CLIENT_ID**
   - Value: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
   - Environment: ✅ Production ✅ Preview ✅ Development

2. **WIX_CLIENT_ID**
   - Value: `a3afb75a-cc8e-4a53-ade4-1add1f70e72b`
   - Environment: ✅ Production ✅ Preview ✅ Development

3. **WIX_CLIENT_SECRET**
   - Value: `f522403a-6acb-49ed-ba1d-441e6320cee8`
   - Environment: ✅ Production ✅ Preview ✅ Development
   - ⚠️ **Keep this secret!** Never commit to Git.

4. **NEXT_PUBLIC_WIX_REDIRECT_URI**
   - Value: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
   - Environment: ✅ Production

5. **WIX_REDIRECT_URI**
   - Value: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
   - Environment: ✅ Production

### Optional (for local dev):

If you want to test locally, also add:

6. **NEXT_PUBLIC_WIX_REDIRECT_URI** (Development)
   - Value: `http://localhost:3000/api/wix-auth/callback`
   - Environment: ✅ Development

7. **WIX_REDIRECT_URI** (Development)
   - Value: `http://localhost:3000/api/wix-auth/callback`
   - Environment: ✅ Development

## ✅ Configuration Looks Correct!

Your Wix OAuth settings match what we configured in the code. The redirect URI is exactly right: `/api/wix-auth/callback`.

## 🧪 Test Your Setup

1. Visit: `https://wix-keeping-it-cute-app.vercel.app/login`
2. Click "Login with Wix Staff Account"
3. Should redirect to Wix OAuth
4. After authorization, should redirect back successfully

## 🔒 Security Reminder

- ✅ App Secret Key should NEVER be in your code or Git
- ✅ Only store secrets in Vercel Environment Variables
- ✅ The `NEXT_PUBLIC_*` prefix means it's exposed to the browser (OK for Client ID, not Secret)

---

**Everything looks properly configured!** Your OAuth setup should work correctly.


