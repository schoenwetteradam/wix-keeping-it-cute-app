export default async function handler(req, res) {
  const { code } = req.body

  const response = await fetch('https://www.wixapis.com/oauth/access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.WIX_CLIENT_ID,
      client_secret: process.env.WIX_CLIENT_SECRET,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI,
    }),
  })

  const data = await response.json()

  if (data.access_token) {
    res.status(200).json({ success: true, token: data })
  } else {
    res.status(400).json({ success: false, error: data })
  }
}
