export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.timestamp = new Date().toISOString()
  }
}

export const handleAPIError = (error, req, res) => {
  // Log error details
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    userAgent: req.headers['user-agent']
  })

  // Send appropriate response
  if (error instanceof APIError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      timestamp: error.timestamp
    })
  } else {
    // Handle Supabase errors
    if (error.code && error.code.startsWith('PGRST')) {
      res.status(400).json({
        error: 'Database query error',
        details: error.message,
        code: 'DATABASE_ERROR'
      })
    } else {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Wrapper for API routes
export const withErrorHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      handleAPIError(error, req, res)
    }
  }
}
