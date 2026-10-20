import { createClient } from '@supabase/supabase-js'

// Hardcoded on purpose so the app works on Vercel with zero environment setup.
// The publishable (anon) key is designed to be public. Your data is protected by the
// Row Level Security policies in supabase/schema.sql. Never put a service_role key here.
const supabaseUrl = 'https://gcvvaoovqronosquhdtr.supabase.co'
const supabaseAnonKey = 'sb_publishable_yr2e97ZEVvaz6GEkimUJJg_tRlXtdEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
