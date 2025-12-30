# How to Find the OAuth Redirect URI Section in Wix Dev Center

## ⚠️ Important: You're in the Wrong Section!

I can see from your screenshot that you're in the **"Custom authentication (legacy)"** section. However, your app uses the **standard OAuth 2.0 Authorization Code flow**, which is configured in a different section.

## ✅ Correct Section: "Redirect URIs" for OAuth

The standard OAuth flow requires you to add redirect URIs in a **"Redirect URIs"** section, NOT in "Custom authentication (legacy)".

### How to Find It:

1. **Go to:** https://dev.wix.com/
2. **Click:** "My Apps"
3. **Click on your app**
4. **Click:** "OAuth" in the left sidebar
5. **Look for:** A section titled **"Redirect URIs"** or **"Allowed Redirect URIs"**

   This section should be:
   - ✅ Separate from "Custom authentication (legacy)"
   - ✅ Part of the main OAuth configuration
   - ✅ Usually has a button like "Add Redirect URI" or "Add URL"

### What to Add:

In the **"Redirect URIs"** section, add:
```
https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback
```

## 🔍 If You Can't Find "Redirect URIs" Section

If you don't see a "Redirect URIs" section in your OAuth settings, it might be because:

1. **Your app type doesn't support it** - Try creating a new OAuth app
2. **You need to enable OAuth first** - Look for an "Enable OAuth" toggle
3. **It's named differently** - Look for:
   - "Allowed Redirect URIs"
   - "Callback URLs"
   - "Authorized Redirect URIs"
   - "Redirect URLs"

## 📸 What to Look For

The correct section should look something like this:

```
OAuth
├── App keys
│   ├── App ID
│   └── App Secret Key
├── Redirect URIs          ← THIS IS WHAT YOU NEED
│   └── [Add Redirect URI button]
│   └── [List of registered URIs]
└── Custom authentication (legacy)  ← NOT THIS ONE
```

## ⚠️ About "Custom authentication (legacy)"

The "Custom authentication (legacy)" section is for a **different authentication flow** that:
- Uses a different redirect URL structure
- Is only needed if you're redirecting during app installation
- Is **NOT** what your code is using

Your code uses: `https://www.wix.com/oauth/authorize` (standard OAuth)

So you need the standard OAuth redirect URI section, not the legacy one.

## 🔄 Next Steps

1. Look for "Redirect URIs" section in OAuth settings
2. Add: `https://wix-keeping-it-cute-app.vercel.app/api/wix-auth/callback`
3. Save your changes
4. Try logging in again

If you still can't find it, try:
- Creating a new OAuth app
- Checking Wix documentation for your app type
- Or use the "Custom authentication" section if that's the only option (but this may require code changes)

