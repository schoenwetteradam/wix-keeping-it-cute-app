// Create this file: api/test-env.js
import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV,
      supabase_url: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      working_directory: process.cwd(),
      upload_dir_exists: require('fs').existsSync(require('path').join(process.cwd(), 'public')),
      api_route: 'upload-product-image test endpoint'
    }
    
    res.status(200).json(envCheck)
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}
