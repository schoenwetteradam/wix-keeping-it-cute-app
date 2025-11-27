const TOKEN_ENDPOINT = 'https://www.wixapis.com/oauth2/token'
const DEFAULT_EXPIRY_SECONDS = 4 * 60 * 60 // 4 hours
const EXPIRY_BUFFER_MS = 5 * 60 * 1000 // refresh 5 minutes before expiry

let cachedAuthorizationHeader = null
let cachedExpiresAt = 0

function getAppCredentials() {
  return {
    appId: process.env.WIX_APP_ID || process.env.WIX_CLIENT_ID,
    appSecret: process.env.WIX_APP_SECRET || process.env.WIX_CLIENT_SECRET,
    instanceId:
      process.env.WIX_APP_INSTANCE_ID || process.env.WIX_INSTANCE_ID,
  }
}

function hasValidCache() {
  return (
    cachedAuthorizationHeader &&
    cachedExpiresAt &&
    cachedExpiresAt - EXPIRY_BUFFER_MS > Date.now()
  )
}

async function fetchClientCredentialsToken() {
  const { appId, appSecret, instanceId } = getAppCredentials()

  if (!appId || !appSecret || !instanceId) {
    throw new Error(
      'Missing Wix OAuth environment variables. Provide WIX_APP_ID (or WIX_CLIENT_ID), WIX_APP_SECRET (or WIX_CLIENT_SECRET), and WIX_APP_INSTANCE_ID (or WIX_INSTANCE_ID).'
    )
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: appSecret,
      instance_id: instanceId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to obtain Wix access token: ${response.status} ${errorText || response.statusText}`
    )
  }

  const data = await response.json()
  const accessToken = data.access_token
  const tokenType = data.token_type || 'Bearer'
  const expiresIn = data.expires_in || DEFAULT_EXPIRY_SECONDS

  if (!accessToken) {
    throw new Error('Wix token response did not include an access_token')
  }

  cachedAuthorizationHeader = `${tokenType} ${accessToken}`
  cachedExpiresAt = Date.now() + expiresIn * 1000

  return cachedAuthorizationHeader
}

export async function getWixAuthorizationHeader() {
  if (process.env.WIX_API_TOKEN) {
    return process.env.WIX_API_TOKEN
  }

  if (hasValidCache()) {
    return cachedAuthorizationHeader
  }

  return fetchClientCredentialsToken()
}

export async function getWixRequestHeaders(additionalHeaders = {}) {
  const authorization = await getWixAuthorizationHeader()

  const headers = {
    Authorization: authorization,
    ...additionalHeaders,
  }

  if (process.env.WIX_SITE_ID) {
    headers['wix-site-id'] = process.env.WIX_SITE_ID
  }

  if (process.env.WIX_ACCOUNT_ID) {
    headers['wix-account-id'] = process.env.WIX_ACCOUNT_ID
  }

  return headers
}
