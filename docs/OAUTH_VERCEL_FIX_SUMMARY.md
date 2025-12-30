# Wix OAuth Vercel Fix Summary

## Critical Fixes Applied

### ✅ 1. Token Endpoint URL Fixed (CRITICAL)

**Issue:** Code was using `https://www.wixapis.com/oauth/access`  
**Fix:** Changed to `https://www.wix.com/oauth/access`

**Files Updated:**
- `lib/wix-auth.js` - Main OAuth library
- `api/wix-oauth-callback.js` - Legacy callback handler
- `pages/api/exchange-code.js` - Code exchange endpoint

**Why:** Wix OAuth authorization code flow requires `wix.com/oauth/access`, not `wixapis.com`. The `wixapis.com` endpoints are for client credentials grants only.

---

### ✅ 2. Enhanced Error Logging

**Added comprehensive error logging to:**
- Token exchange failures (with request IDs, status codes, error details)
- Redirect URI mismatches
- Missing environment variables
- OAuth callback errors

**Benefits:**
- Easier debugging in Vercel logs
- Request IDs for Wix support
- Clear error messages for users

---

### ✅ 3. Strict Redirect URI Validation

**Improvements:**
- Automatic trailing slash removal (Wix is strict about this)
- HTTPS validation in production
- Host matching validation
- Clear error messages when mismatches occur

**Files Updated:**
- `lib/wix-auth.js` - `resolveWixRedirectUri()` function

---

### ✅ 4. Diagnostic Endpoint Created

**New Endpoint:** `GET /api/wix-auth/diagnostic`

**What it checks:**
- Environment variables (WIX_CLIENT_ID, WIX_CLIENT_SECRET, etc.)
- Redirect URI configuration
- Auth URL generation
- Callback route availability
- Configuration checklist

**Usage:**
```bash
# In browser or curl
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/diagnostic
```

---

### ✅ 5. Improved Callback Route

**Enhancements:**
- Better error handling with specific error messages
- Enhanced logging for debugging
- Proper state parameter handling
- Secure cookie configuration

---

## Verification Checklist

### In Wix Dev Center

1. **Redirect URI** must be EXACTLY:
   ```
   https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```
   - ✅ No trailing slash
   - ✅ HTTPS (not HTTP)
   - ✅ Exact path match

2. **OAuth Settings:**
   - App ID (Client ID) is set
   - App Secret (Client Secret) is set
   - Redirect URI is registered

### In Vercel Dashboard

1. **Environment Variables** (Settings → Environment Variables):
   ```
   WIX_CLIENT_ID = your-app-id
   WIX_CLIENT_SECRET = your-app-secret
   WIX_REDIRECT_URI = https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   NEXT_PUBLIC_WIX_CLIENT_ID = your-app-id
   NEXT_PUBLIC_WIX_REDIRECT_URI = https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
   ```

2. **Set for:**
   - ✅ Production
   - ⚠️ Preview (optional - preview URLs won't work unless added to Wix)

3. **Redeploy** after adding/changing environment variables

---

## Testing Steps

### 1. Run Diagnostic Endpoint

```bash
curl https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/diagnostic
```

**Expected:** All checks should show ✅

### 2. Test Callback Route

```bash
curl https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

**Expected:** Should return 400 (missing code) or redirect, NOT 404

### 3. Test OAuth Flow

1. Navigate to login page
2. Click "Login with Wix"
3. Should redirect to Wix authorization page
4. After authorization, should redirect back to your app
5. Check Vercel logs for any errors

---

## Common Issues & Solutions

### Issue: "Invalid grant" error

**Cause:** Redirect URI mismatch  
**Solution:**
1. Check diagnostic endpoint
2. Verify redirect URI in Wix Dev Center matches exactly
3. Ensure no trailing slashes
4. Verify HTTPS (not HTTP)

### Issue: "Missing Wix OAuth configuration"

**Cause:** Environment variables not set  
**Solution:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure variables are set for Production environment
3. Redeploy after adding variables

### Issue: 404 on callback route

**Cause:** Route not deployed  
**Solution:**
1. Verify file exists: `pages/api/wix-auth/callback.js`
2. Check Vercel deployment logs
3. Ensure route is accessible

### Issue: Blank page on Wix authorization

**Cause:** Redirect URI not registered in Wix  
**Solution:**
1. Go to Wix Dev Center → Your App → OAuth
2. Add redirect URI exactly as shown above
3. Save changes

---

## Files Modified

1. `lib/wix-auth.js` - Token endpoint, redirect URI validation, error handling
2. `api/wix-oauth-callback.js` - Token endpoint, error logging
3. `pages/api/exchange-code.js` - Token endpoint
4. `pages/api/wix-auth/callback.js` - Enhanced error handling
5. `pages/api/wix-auth/diagnostic.js` - **NEW** diagnostic endpoint

---

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Run diagnostic endpoint
3. ✅ Verify environment variables in Vercel
4. ✅ Test OAuth flow
5. ✅ Check Vercel logs for any issues

---

## Support

If issues persist:

1. Check Vercel logs for detailed error messages
2. Run diagnostic endpoint: `/api/wix-auth/diagnostic`
3. Verify Wix Dev Center configuration
4. Check that redirect URI matches exactly (byte-for-byte)

---

## Notes

- **Preview deployments** (`*-git-*.vercel.app`) will NOT work unless explicitly added to Wix Dev Center
- **Token endpoint** is now correctly using `wix.com/oauth/access`
- **offline_access scope** is first in scope list (required for refresh tokens)
- All error messages now include request IDs when available for Wix support

