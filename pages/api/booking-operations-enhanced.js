import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET,POST')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  try {
    switch (action) {
      case 'test-edge-proxy':
        return await testEdgeProxy(req, res)
      case 'hybrid-availability':
        return await hybridAvailability(req, res)
      default:
        // Proxy to Edge Function
        return await proxyToEdgeFunction(req, res)
    }
  } catch (error) {
    console.error('Enhanced booking operations error:', error)
    res.status(500).json({ error: error.message })
  }
}

async function testEdgeProxy(req, res) {
  const edgeURL = process.env.SUPABASE_URL + '/functions/v1/booking-operations'

  try {
    const response = await fetch(`${edgeURL}?action=get-upcoming&limit=5`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    res.status(200).json({
      success: true,
      source: 'edge_function_proxy',
      edge_response: data,
      edge_status: response.status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      source: 'edge_function_proxy_failed'
    })
  }
}

async function proxyToEdgeFunction(req, res) {
  const edgeURL = process.env.SUPABASE_URL + '/functions/v1/booking-operations'

  try {
    const response = await fetch(`${edgeURL}?${new URLSearchParams(req.query)}`, {
      method: req.method,
      headers: {
        Authorization: req.headers.authorization || `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({
      error: 'Edge function unavailable',
      fallback_message: 'Using Vercel API fallback'
    })
  }
}

async function hybridAvailability(req, res) {
  // Placeholder for hybrid availability logic
  return res.status(501).json({ error: 'Not implemented' })
}

