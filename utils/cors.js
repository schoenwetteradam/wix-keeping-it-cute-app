export function setCorsHeaders(res, methods) {
  const methodList = Array.isArray(methods) ? methods.join(', ') : methods
  const allowMethods = methodList.includes('OPTIONS') ? methodList : `${methodList}, OPTIONS`

  const allowedOrigin = process.env.CORS_ALLOW_ORIGIN
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }

  res.setHeader('Access-Control-Allow-Methods', allowMethods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
