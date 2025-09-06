// Simple in-memory rate limiter
const requestCounts = new Map()

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    message = 'Too many requests'
  } = options

  return (req, res, next) => {
    const key = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress || 
                'unknown'
    
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get existing requests for this IP
    const requests = requestCounts.get(key) || []
    
    // Filter out old requests
    const validRequests = requests.filter(time => time > windowStart)
    
    if (validRequests.length >= max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }
    
    // Add current request
    validRequests.push(now)
    requestCounts.set(key, validRequests)
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [ip, times] of requestCounts) {
        const valid = times.filter(time => time > windowStart)
        if (valid.length === 0) {
          requestCounts.delete(ip)
        } else {
          requestCounts.set(ip, valid)
        }
      }
    }
    
    next()
  }
}

// Usage in API routes
export const withRateLimit = (handler, options) => {
  const limiter = rateLimit(options)
  
  return (req, res) => {
    limiter(req, res, () => {
      handler(req, res)
    })
  }
}
