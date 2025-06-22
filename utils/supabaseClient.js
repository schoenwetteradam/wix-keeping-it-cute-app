import { createClient } from '@supabase/supabase-js'

// Allow both NEXT_PUBLIC_* and server-side variable names
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration: ensure SUPABASE_URL and SUPABASE_ANON_KEY are set'
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
