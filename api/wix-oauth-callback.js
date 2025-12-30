import cookie from 'cookie'
import { buildRedirectUriFromRequest, resolveWixRedirectUri } from '../lib/wix-auth'

export default async function handler(req, res) {
  const { code, state, error: oauthError } = req.query

  // Handle OAuth errors from Wix
  if (oauthError) {
    console.error('Wix OAuth error:', oauthError)
    return res.redirect(`/login?error=${encodeURIComponent(oauthError)}`)
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  // Parse state parameter for return URL
  let returnUrl = '/staff' // Default fallback
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      returnUrl = stateData.returnUrl || '/staff'
    } catch (parseError) {
      console.warn('Could not parse state parameter, using default return URL:', parseError.message)
    }
  }

  const clientId = process.env.WIX_CLIENT_ID
  const clientSecret = process.env.WIX_CLIENT_SECRET

  const fallbackRedirectUri = buildRedirectUriFromRequest(req)

  let redirectUri
  try {
    redirectUri = resolveWixRedirectUri(fallbackRedirectUri)
  } catch (error) {
    return res.status(500).json({
      error: 'Missing Wix OAuth configuration',
      details: error.message,
    })
  }

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Missing Wix OAuth configuration',
      details: 'Set WIX_CLIENT_ID, WIX_CLIENT_SECRET, and WIX_REDIRECT_URI (or provide NEXT_PUBLIC_WIX_REDIRECT_URI).'
    })
  }

  try {
    // CRITICAL: Must use wix.com/oauth/access, not wixapis.com
    const tokenRes = await fetch('https://www.wix.com/oauth/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error_description || errorJson.error || errorText
      } catch {
        // Keep text as-is if not JSON
      }
      
      const requestId = tokenRes.headers.get('x-wix-request-id') || tokenRes.headers.get('x-request-id')
      console.error('Token exchange failed:', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        error: errorDetails,
        requestId,
        redirectUri,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      })
      
      return res.redirect(`/login?error=${encodeURIComponent(`Authentication failed: ${errorDetails}`)}`)
    }

    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    // Set cookie with access token
    res.setHeader('Set-Cookie', cookie.serialize('wix_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in || 3600
    }))

    // Redirect to the return URL from state parameter
    return res.redirect(returnUrl)
  } catch (error) {
    console.error('Wix OAuth Error:', error)
    return res.redirect(`/login?error=${encodeURIComponent('Authentication failed')}`)
  }
}
