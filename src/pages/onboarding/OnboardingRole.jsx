import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { AuthShell } from '../../components/ui';

const roles = [
  {
    key: 'creator',
    title: "I'm a Creator",
    desc: 'I create content and want to collaborate with brands',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
  },
  {
    key: 'brand',
    title: "I'm a Brand",
    desc: 'I want to find creators and run campaigns',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
];

export default function OnboardingRole() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user already has profile completed
    const checkProfileStatus = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        // If user exists and has completed profile, redirect to dashboard
        if (data && data.role) {
          navigate('/projects');
        }
      } catch (err) {
        console.error('Error checking profile status:', err);
      }
    };

    checkProfileStatus();
  }, [user, navigate]);

  const handleContinue = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Upsert the users row with the selected role. Works whether or not the
      // signup trigger already created the row, and sets the role for OAuth
      // users (whose row has no role yet). Only role/email/id are written, so
      // any existing display_name/bio/avatar are preserved.
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          { id: user.id, email: user.email, role: selectedRole },
          { onConflict: 'id' }
        );

      if (upsertError) throw upsertError;

      // Ensure the matching creators/brands row exists before moving on, so the
      // user can immediately post projects/campaigns. The DB trigger also does
      // this; awaiting the endpoint guarantees it even if triggers aren't set up.
      try {
        await apiFetch('/api/profile/me/initialize', { method: 'POST' });
      } catch (initErr) {
        // Non-fatal: the DB trigger covers provisioning as well.
        console.error('Profile provisioning call failed (non-fatal):', initErr);
      }

      // Store selected role in sessionStorage for Profile page
      sessionStorage.setItem('selectedRole', selectedRole);

      // Redirect to Profile page for profile completion
      navigate('/profile/' + user?.id);
    } catch (err) {
      console.error('Error saving role:', err);
      setError(err.message || 'Failed to save role. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">Welcome aboard</p>
        <h2 className="font-display text-4xl font-bold text-white">Welcome to CollabHub!</h2>
        <p className="mt-3 text-slate-400">Tell us what best describes you — this shapes your workspace.</p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <div className="space-y-4 mb-8">
        {roles.map(({ key, title, desc, icon }) => {
          const active = selectedRole === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedRole(key)}
              className={`w-full p-6 rounded-2xl border text-left transition-all duration-200 flex items-start gap-5 ${active
                ? 'border-primary-500/60 bg-primary-500/10 shadow-glow-primary'
                : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${active
                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                : 'bg-white/[0.04] border-white/10 text-slate-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-1 ${active ? 'text-white' : 'text-slate-200'}`}>{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 transition-all ${active
                ? 'border-primary-400 bg-primary-500'
                : 'border-slate-600'}`}
              >
                {active && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={isLoading || !selectedRole}
        className="btn-primary btn-lg w-full"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Setting up…
          </>
        ) : (
          <>
            Continue
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        )}
      </button>
    </AuthShell>
  );
}
