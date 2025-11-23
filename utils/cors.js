// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://wix-keeping-it-cute-app.vercel.app',
  'https://www.keepingitcutesalon.com',
  'https://keepingitcutesalon.com',
  process.env.NEXT_PUBLIC_APP_URL,
  // Allow localhost in development
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ] : [])
].filter(Boolean);

export function setCorsHeaders(res, methods, req = null) {
  const methodList = Array.isArray(methods) ? methods.join(', ') : methods
  const allowMethods = methodList.includes('OPTIONS') ? methodList : `${methodList}, OPTIONS`

  // Get the origin from the request
  const origin = req?.headers?.origin || '';

  // Check if the origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow all origins but log a warning
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else {
    // In production, use the first allowed origin as default
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || 'https://wix-keeping-it-cute-app.vercel.app')
  }

  res.setHeader('Access-Control-Allow-Methods', allowMethods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wix-webhook-signature')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

// Export for webhook endpoints that need to accept Wix webhooks
export function setWebhookCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature')
}
