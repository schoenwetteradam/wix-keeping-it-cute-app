export function setCorsHeaders(res, methods) {
  const methodList = Array.isArray(methods) ? methods.join(', ') : methods
  const allowMethods = methodList.includes('OPTIONS') ? methodList : `${methodList}, OPTIONS`
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', allowMethods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
