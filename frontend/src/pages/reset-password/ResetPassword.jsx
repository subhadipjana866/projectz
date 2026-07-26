import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell, PasswordInput } from '../../components/ui';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

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
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell headerAction={<Link to="/login" className="btn-secondary btn-md">Sign in</Link>}>
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">Account recovery</p>
        <h2 className="font-display text-4xl font-bold text-white">Reset password</h2>
        <p className="mt-3 text-slate-400">Create a new password for your account.</p>
      </div>

      {error && !success && <div className="alert-error mb-6">{error}</div>}

      {success ? (
        <div className="glass p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-full mb-5">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Password reset successfully!</p>
          <p className="text-sm text-slate-400 mt-2">Redirecting to login…</p>
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
            {isLoading ? 'Resetting Password…' : 'Reset Password'}
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
