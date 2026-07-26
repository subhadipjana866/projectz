import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pathAfterAuth } from '../../lib/routing';
import { AuthShell, AuthDivider, PasswordInput, SocialAuthButtons } from '../../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, session, loading, signInWithGoogle, signInWithX, signInWithDiscord, signInWithLinkedin } = useAuth();
  const autoLoginAttempted = useRef(false);

  // Redirect if already logged in — to the app if a role is set, else onboarding.
  useEffect(() => {
    if (!loading && session) {
      pathAfterAuth(session.user.id).then((path) => navigate(path, { replace: true }));
    }
  }, [session, loading, navigate]);

  const performLogin = async (emailParam, passwordParam) => {
    setError('');
    setIsLoading(true);

    try {
      await signIn(emailParam, passwordParam);
      // Session will be updated by useAuth hook and trigger redirect
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const socialLogin = (fn, providerName) => async () => {
    try {
      setError('');
      setIsLoading(true);
      await fn();
    } catch (err) {
      setError(err.message || `Failed to sign in with ${providerName}`);
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      headerAction={
        <Link to="/register" className="btn-secondary btn-md">Create account</Link>
      }
    >
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">Welcome back</p>
        <h2 className="font-display text-4xl font-bold text-white">Sign in to CollabHub</h2>
        <p className="mt-3 text-slate-400">Enter your credentials to access your workspace.</p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@company.com"
            className="field"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
              Forgot password?
            </Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full !mt-8">
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <AuthDivider />

      <SocialAuthButtons
        disabled={isLoading}
        onGoogle={socialLogin(signInWithGoogle, 'Google')}
        onLinkedin={socialLogin(signInWithLinkedin, 'LinkedIn')}
        onDiscord={socialLogin(signInWithDiscord, 'Discord')}
        onX={socialLogin(signInWithX, 'X')}
      />

      <p className="text-center text-sm text-slate-400 mt-8">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
