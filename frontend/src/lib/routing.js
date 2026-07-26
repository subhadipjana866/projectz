import { supabase } from './supabase';

// Where to send a user right after authentication: into the app if they've
// already chosen a role, otherwise to onboarding to pick one. Prevents
// role-less users (e.g. abandoned OAuth onboarding) from landing on an
// empty, broken feed.
export async function pathAfterAuth(userId) {
  if (!userId) return '/login';
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    return data?.role ? '/projects' : '/onboarding-role';
  } catch {
    return '/projects';
  }
}
