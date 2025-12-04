import { withErrorHandler, APIError } from '../../utils/errorHandler'

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const { code } = req.body || {}
  const clientId = process.env.WIX_CLIENT_ID
  const clientSecret = process.env.WIX_CLIENT_SECRET
  const redirectUri = process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI

  if (!code) {
    throw new APIError('Authorization code is required', 400, 'MISSING_CODE')
  }

  if (!clientId || !clientSecret || !redirectUri) {
    throw new APIError('Missing Wix OAuth configuration', 500, 'WIX_CONFIG_ERROR')
  }

  const response = await fetch('https://www.wixapis.com/oauth/access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    let details = 'Failed to exchange code'
    try {
      const errorBody = await response.json()
      details = errorBody.error_description || errorBody.message || details
    } catch (parseError) {
      const fallback = await response.text()
      details = fallback || details
    }

    const requestId =
      response.headers.get('x-wix-request-id') || response.headers.get('x-request-id')

    if (requestId) {
      details = `${details} (Request ID: ${requestId})`
    }

    throw new APIError(details, response.status, 'WIX_OAUTH_ERROR')
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new APIError('Failed to exchange code', 400, 'WIX_OAUTH_ERROR')
  }

  res.status(200).json({ success: true, token: data })
}

export default withErrorHandler(handler)
