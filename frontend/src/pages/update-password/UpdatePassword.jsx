import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AuthShell, PasswordInput } from '../../components/ui';

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
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell headerAction={<Link to="/login" className="btn-secondary btn-md">Sign in</Link>}>
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">Account security</p>
        <h2 className="font-display text-4xl font-bold text-white">Update password</h2>
        <p className="mt-3 text-slate-400">Create a new password for your account.</p>
      </div>

      {error && !success && (
        <div className="alert-error mb-6">
          {error}
          {!sessionReady && (
            <Link to="/forgot-password" className="block text-xs underline mt-2 text-rose-300 hover:text-rose-200">
              Request a new password reset link
            </Link>
          )}
        </div>
      )}

      {success ? (
        <div className="glass p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-full mb-5">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Password updated successfully!</p>
          <p className="text-sm text-slate-400 mt-2">Redirecting to login…</p>
        </div>
      ) : !sessionReady ? (
        <div className="alert-info text-center">
          Please click the password reset link from the email we sent you to proceed.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">New Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
            />
            <p className="text-xs text-slate-500 mt-2 text-left">At least 8 characters</p>
          </div>

          <div>
            <label className="field-label">Confirm Password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full !mt-7">
            {isLoading ? 'Updating Password…' : 'Update Password'}
          </button>
        </form>
      )}

      {!success && (
        <p className="text-center text-sm text-slate-400 mt-9">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">Sign In</Link>
        </p>
      )}
    </AuthShell>
  );
}
