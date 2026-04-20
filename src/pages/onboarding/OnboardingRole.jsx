import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo.svg';
import './OnboardingRole.css';

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
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        // If user exists and has completed profile, redirect to dashboard
        if (data && data.role) {
          navigate('/dashboard');
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
      // Check if user already exists in the users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // If user doesn't exist, create them with the selected role
      if (existingUser && !existingUser.role) {
        // User exists but hasn't completed profile, update their role
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: selectedRole })
          .eq('id', user.id);

        if (updateError) throw updateError;
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
    <div
      className="min-h-screen flex flex-col items-center justify-center w-full overflow-hidden px-4"
      style={{
        backgroundImage: `
          url('data:image/svg+xml;utf8,<svg viewBox="0 0 1280 1024" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="0" y="0" height="100%" width="100%" fill="url(%23grad)" opacity="1"/><defs><radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10" gradientTransform="matrix(181.02 0 0 144.82 0 0)"><stop stop-color="rgba(17,82,212,0.15)" offset="0"/><stop stop-color="rgba(17,82,212,0)" offset="0.5"/></radialGradient></defs></svg>'),
          url('data:image/svg+xml;utf8,<svg viewBox="0 0 1280 1024" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="0" y="0" height="100%" width="100%" fill="url(%23grad)" opacity="1"/><defs><radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10" gradientTransform="matrix(181.02 0 0 144.82 1280 1024)"><stop stop-color="rgba(17,82,212,0.1)" offset="0"/><stop stop-color="rgba(17,82,212,0)" offset="0.5"/></radialGradient></defs></svg>'),
          linear-gradient(90deg, rgb(16, 22, 34) 0%, rgb(16, 22, 34) 100%)
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Card */}
      <div className="backdrop-blur-md bg-[rgba(16,22,34,0.4)] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl p-10 w-full max-w-[32rem]">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-brand-blue flex items-center justify-center p-2 rounded-lg">
            <img src={logo} alt="Logo" className="w-8 h-8" />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-2">Welcome to CollabHub!</h2>
          <p className="text-slate-400">Tell us what best describes you</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Role Selection */}
        <div className="space-y-4 mb-8">
          {/* Creator Option */}
          <button
            onClick={() => setSelectedRole('creator')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedRole === 'creator'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${
                selectedRole === 'creator'
                  ? 'border-brand-blue bg-brand-blue'
                  : 'border-slate-400'
              }`}>
                {selectedRole === 'creator' && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">I'm a Creator</h3>
                <p className="text-sm text-slate-400">
                  I create content and want to collaborate with brands
                </p>
              </div>
            </div>
          </button>

          {/* Brand Option */}
          <button
            onClick={() => setSelectedRole('brand')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedRole === 'brand'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${
                selectedRole === 'brand'
                  ? 'border-brand-blue bg-brand-blue'
                  : 'border-slate-400'
              }`}>
                {selectedRole === 'brand' && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">I'm a Brand</h3>
                <p className="text-sm text-slate-400">
                  I want to find creators and run campaigns
                </p>
              </div>
            </div>
          </button>

          {/* Agency Option */}
          <button
            onClick={() => setSelectedRole('agency')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedRole === 'agency'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${
                selectedRole === 'agency'
                  ? 'border-brand-blue bg-brand-blue'
                  : 'border-slate-400'
              }`}>
                {selectedRole === 'agency' && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">I'm an Agency</h3>
                <p className="text-sm text-slate-400">
                  I represent an agency managing creator partnerships
                </p>
              </div>
            </div>
          </button>

          {/* Production Option */}
          <button
            onClick={() => setSelectedRole('production')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedRole === 'production'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${
                selectedRole === 'production'
                  ? 'border-brand-blue bg-brand-blue'
                  : 'border-slate-400'
              }`}>
                {selectedRole === 'production' && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">I'm in Production</h3>
                <p className="text-sm text-slate-400">
                  I'm a production company looking to collaborate
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={isLoading || !selectedRole}
          className="w-full px-6 py-3 bg-brand-blue hover:bg-brand-dark-blue disabled:bg-slate-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Setting up...
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
      </div>
    </div>
  );
}
