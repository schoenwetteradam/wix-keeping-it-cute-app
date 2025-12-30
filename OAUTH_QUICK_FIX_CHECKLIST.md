# Wix OAuth Quick Fix Checklist

## ✅ Code Fixes Applied

All code issues from your checklist have been fixed:

1. ✅ **Token endpoint corrected** - Now using `https://www.wix.com/oauth/access`
2. ✅ **Error logging enhanced** - Comprehensive logging with request IDs
3. ✅ **Redirect URI validation** - Strict validation, trailing slash removal
4. ✅ **Diagnostic endpoint** - `/api/wix-auth/diagnostic` for debugging
5. ✅ **Callback route improved** - Better error handling

---

## 🔍 Verify Configuration (5 minutes)

### Step 1: Check Diagnostic Endpoint

After deploying, visit:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/diagnostic
```

This will show you:
- ✅ Environment variables status
- ✅ Redirect URI configuration
- ✅ Configuration checklist

### Step 2: Verify Wix Dev Center

1. Go to: https://dev.wix.com/
2. Your App → OAuth
3. **Redirect URI must be EXACTLY:**
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
   - No trailing slash
   - HTTPS (not HTTP)
   - Exact match

### Step 3: Verify Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables

**Required:**
- `WIX_CLIENT_ID` = your-app-id
- `WIX_CLIENT_SECRET` = your-app-secret
- `WIX_REDIRECT_URI` = `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
- `NEXT_PUBLIC_WIX_CLIENT_ID` = your-app-id
- `NEXT_PUBLIC_WIX_REDIRECT_URI` = `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`

**Set for:** Production (and Preview if needed)

### Step 4: Test Callback Route

Visit:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**Expected:** 400 error (missing code) or redirect - NOT 404

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid grant" | Redirect URI mismatch - check Wix Dev Center |
| "Missing configuration" | Environment variables not set in Vercel |
| 404 on callback | Route not deployed - check deployment |
| Blank Wix page | Redirect URI not registered in Wix |

---

## 📝 What Was Fixed

### Critical Fix: Token Endpoint
- **Before:** `https://www.wixapis.com/oauth/access` ❌
- **After:** `https://www.wix.com/oauth/access` ✅

### Enhanced Error Handling
- Request IDs logged for Wix support
- Specific error messages for common issues
- Detailed logging in Vercel

### Redirect URI Validation
- Automatic trailing slash removal
- HTTPS validation
- Host matching checks

### New Diagnostic Tool
- `/api/wix-auth/diagnostic` endpoint
- Real-time configuration check
- Actionable recommendations

---

## 🎯 Next Steps

1. **Deploy to Vercel**
2. **Run diagnostic:** `/api/wix-auth/diagnostic`
3. **Verify Wix configuration** matches exactly
4. **Test OAuth flow** end-to-end
5. **Check Vercel logs** if issues persist

---

## 📚 Full Documentation

See `docs/OAUTH_VERCEL_FIX_SUMMARY.md` for complete details.

