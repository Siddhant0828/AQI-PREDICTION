import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful fallback: never throw at import time — that would blank the whole app.
// If credentials are missing/expired, auth calls simply fail with a clear error
// and the user still sees the Login screen instead of a white page.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }
);
