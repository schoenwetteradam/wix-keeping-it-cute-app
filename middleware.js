import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Bypass authentication for Wix webhook router and log incoming headers
  if (pathname.startsWith('/api/webhook-router')) {
    console.log('Bypassing middleware for webhook-router. Headers:', Object.fromEntries(req.headers))
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

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.next()
}
