import { withErrorHandler, APIError } from '../../utils/errorHandler'

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const { code } = req.body

  const response = await fetch('https://www.wixapis.com/oauth/access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.WIX_CLIENT_ID,
      client_secret: process.env.WIX_CLIENT_SECRET,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI
    })
  })

  if (!response.ok) {
    throw new APIError('Failed to exchange code', response.status, 'WIX_OAUTH_ERROR')
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new APIError('Failed to exchange code', 400, 'WIX_OAUTH_ERROR')
  }

  res.status(200).json({ success: true, token: data })
}

export default withErrorHandler(handler)
