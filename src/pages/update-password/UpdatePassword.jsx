import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo.svg';
import './UpdatePassword.css';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const { updatePassword, session, loading } = useAuth();
  const sessionCheckDone = useRef(false);

  // Check if user has a valid session from password reset email
  useEffect(() => {
    const checkSession = async () => {
      if (sessionCheckDone.current || loading) return;
      sessionCheckDone.current = true;

      // Check URL hash for recovery token
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const type = params.get('type');

      // Check if there's a valid session (from email link or already logged in)
      if (session && session.user) {
        setSessionReady(true);
      } else if (accessToken && type === 'recovery') {
        // Supabase should have already set the session from the URL
        // Try to get the current session
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setSessionReady(true);
          } else {
            setError('Invalid or expired password reset link. Please request a new one.');
          }
        } catch (err) {
          setError('Failed to verify password reset link.');
        }
      } else if (!loading && !session) {
        setError('You need to click the password reset link from your email to change your password.');
      }
    };

    checkSession();
  }, [session, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(password);

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      let errorMessage = 'Failed to update password';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-start w-full overflow-hidden"
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
      {/* Header */}
      <div className="backdrop-blur-md bg-[rgba(16,22,34,0.4)] border-b border-[rgba(255,255,255,0.1)] w-full flex items-center justify-between px-20">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-brand-blue flex items-center justify-center p-1.5 rounded-lg">
            <img src={logo} alt="Logo" className="w-6 h-6"/>
          </div>
          <h1 className="font-bold text-xl text-white">CollabHub</h1>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center w-full px-6 py-12">
        {/* Password Card */}
        <div className="backdrop-blur-md bg-[rgba(16,22,34,0.4)] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl p-10 w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Update Password</h2>
            <p className="text-slate-400">Create a new password for your account</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-6">
              <p className="text-sm text-green-400">
                ✓ Password updated successfully! Redirecting to login...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <p className="text-sm text-red-400">{error}</p>
              {!sessionReady && (
                <Link to="/forgot-password" className="text-xs text-red-400 underline mt-2 inline-block">
                  Request a new password reset link
                </Link>
              )}
            </div>
          )}

          {/* Form */}
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <span className="text-2xl text-green-400">✓</span>
              </div>
              <p className="text-slate-300 mb-4">Password updated successfully!</p>
              <p className="text-sm text-slate-400 mb-6">Redirecting to login...</p>
            </div>
          ) : !sessionReady ? (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
              <p className="text-sm text-blue-400">
                Please click the password reset link from the email we sent you to proceed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 pl-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                  className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
                <p className="text-xs text-slate-400 mt-2">At least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 pl-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 bg-brand-blue hover:bg-brand-dark-blue disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Link Back */}
          {!success && (
            <p className="text-center text-slate-400 mt-8">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-brand-blue hover:text-brand-dark-blue transition-colors">
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex items-center justify-center py-6 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-sm text-slate-500">© 2024 CollabHub. All rights reserved.</p>
      </div>
    </div>
  );
}
