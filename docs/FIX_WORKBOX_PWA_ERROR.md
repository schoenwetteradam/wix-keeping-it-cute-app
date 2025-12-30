# Fix: Workbox PWA Error - app-build-manifest.json

## Error
```
Uncaught (in promise) bad-precaching-response: bad-precaching-response :: 
[{"url":"https://wix-keeping-it-cute-app.vercel.app/_next/app-build-manifest.json","status":404}]
```

## Cause

Next.js App Router doesn't generate `app-build-manifest.json` (it's a Pages Router feature), but `next-pwa` is trying to precache it, causing a 404 error.

## Fix Applied

Updated `next.config.js` to exclude `app-build-manifest.json` from precaching:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
  exclude: [
    /app-build-manifest\.json$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
  ],
  // ... rest of config
});
```

## Next Steps

1. **Rebuild your app:**
   ```bash
   npm run build
   ```

2. **Redeploy to Vercel:**
   - The error should be gone after redeployment

3. **Clear browser cache:**
   - Clear cache and service workers
   - Or use incognito/private window

## Verification

After redeployment, the Workbox error should be gone. The PWA will still work correctly without precaching the build manifest.

