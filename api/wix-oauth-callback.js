import cookie from 'cookie'
import { resolveWixRedirectUri } from '../lib/wix-auth'

export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.WIX_CLIENT_ID
  const clientSecret = process.env.WIX_CLIENT_SECRET

  const protocolHeader = req.headers['x-forwarded-proto']
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || 'https'
  const host = req.headers.host

  const fallbackRedirectUri = host
    ? `${protocol}://${host}/api/wix-oauth-callback`
    : null

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
    const tokenRes = await fetch('https://www.wixapis.com/oauth/access', {
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
      const err = await tokenRes.text()
      return res.status(500).json({ error: 'Failed to fetch access token', details: err })
    }

    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    res.setHeader('Set-Cookie', cookie.serialize('wix_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    }))

    res.redirect('/staff')
  } catch (error) {
    console.error('Wix OAuth Error:', error)
    res.status(500).json({ error: 'OAuth error', details: error.message })
  }
}
