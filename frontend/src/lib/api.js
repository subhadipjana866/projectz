import { supabase } from './supabase';

// fetch() wrapper that attaches the current Supabase access token so the
// backend can verify who the caller is (instead of trusting a userId param).
// Use this for every call to our own /api backend.
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(path, { ...options, headers });
}
