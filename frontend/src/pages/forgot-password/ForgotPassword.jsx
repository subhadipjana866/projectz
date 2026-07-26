import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell } from '../../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await resetPassword(email);

      setSuccess(true);
      setEmail('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell headerAction={<Link to="/login" className="btn-secondary btn-md">Sign in</Link>}>
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">Account recovery</p>
        <h2 className="font-display text-4xl font-bold text-white">Forgot password?</h2>
        <p className="mt-3 text-slate-400">No worries — we'll send you a link to reset it.</p>
      </div>

      {error && !success && <div className="alert-error mb-6">{error}</div>}

      {success ? (
        <div className="glass p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-full mb-5">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Check your email!</p>
          <p className="text-sm text-slate-400 mt-2">We've sent you a password reset link. Redirecting to login…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              className="field"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full !mt-7">
            {isLoading ? 'Sending Reset Link…' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className="space-y-2.5 mt-9 text-sm text-center text-slate-400">
        <p>
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">Sign In</Link>
        </p>
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">Create one</Link>
        </p>
      </div>
    </AuthShell>
  );
}
