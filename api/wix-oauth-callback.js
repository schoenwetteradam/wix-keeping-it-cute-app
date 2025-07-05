import cookie from 'cookie'

export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.WIX_CLIENT_ID
  const clientSecret = process.env.WIX_CLIENT_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_WIX_REDIRECT_URI

  try {
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
