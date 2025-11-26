import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow unauthenticated access for certain public API routes
  const publicPaths = [
    '/api/webhook-router',
    '/api/get-branding',
    '/api/health',
    '/api/wix-health',
    '/api/import-all-wix-data',
    '/api/test-connection',
    '/api/test-bookings-endpoints'
  ]
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith('/api/webhook-router')) {
      console.log('Bypassing middleware for webhook-router. Headers:', Object.fromEntries(req.headers))
    }
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  const allowedDomains = (process.env.ALLOWED_STAFF_DOMAINS || 'keepingitcute.com,wix.com')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userEmail = data.user.email?.toLowerCase() || ''
  const userDomain = userEmail.split('@')[1]
  const domainAllowed = userDomain && allowedDomains.includes(userDomain)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  const role = profile?.role?.toLowerCase()
  const isStaff = role === 'staff' || role === 'admin'

  if (!domainAllowed || !isStaff) {
    return new NextResponse('Staff access required', { status: 403 })
  }

  return NextResponse.next()
}
