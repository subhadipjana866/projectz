import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthShell, AuthDivider, PasswordInput, SocialAuthButtons } from '../../components/ui';

const roleOptions = [
  {
    key: 'creator',
    title: 'Creator',
    desc: 'I make content and want to work with brands',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
  },
  {
    key: 'brand',
    title: 'Brand',
    desc: 'I want to find creators and run campaigns',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
];

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'creator',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, registerWithGoogle, signInWithX, signInWithDiscord, signInWithLinkedin } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirm_password || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Store registration data temporarily for OTP verification
      sessionStorage.setItem('registrationData', JSON.stringify({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      }));

      // Generate OTP and show message
      await signUp(formData.email, formData.password, formData.name, formData.role);
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const socialSignUp = (fn, providerName) => async () => {
    try {
      setError('');
      setIsLoading(true);
      await fn();
    } catch (err) {
      setError(err.message || `Failed to sign up with ${providerName}`);
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      headerAction={<Link to="/login" className="btn-secondary btn-md">Sign in</Link>}
    >
      <div className="text-left mb-8">
        <p className="eyebrow mb-2">Join the network</p>
        <h2 className="font-display text-4xl font-bold text-white">Create your account</h2>
        <p className="mt-3 text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">Log in</Link>
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selector */}
        <div>
          <label className="field-label">I am a…</label>
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map(({ key, title, desc, icon }) => {
              const active = formData.role === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key)}
                  className={`relative p-4 rounded-2xl border text-left transition-all duration-200 ${active
                    ? 'border-primary-500/60 bg-primary-500/10 shadow-glow-primary'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
                >
                  <svg className={`w-6 h-6 mb-2 ${active ? 'text-primary-300' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                  <p className={`font-bold text-sm ${active ? 'text-white' : 'text-slate-300'}`}>{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  {active && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="field-label">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Jane"
            className="field"
          />
        </div>

        <div>
          <label className="field-label">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="jane@example.com"
            className="field"
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
          />
          <p className="text-xs text-slate-500 mt-2 text-left">At least 8 characters</p>
        </div>

        <div>
          <label className="field-label">Confirm Password</label>
          <PasswordInput
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="Confirm your password"
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full !mt-7 group">
          {isLoading ? 'Creating account…' : 'Get Started'}
          {!isLoading && (
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          By clicking "Get Started", you agree to our{' '}
          <Link to="#" className="text-primary-400 hover:text-primary-300">Terms of Service</Link>
          {' '}and{' '}
          <Link to="#" className="text-primary-400 hover:text-primary-300">Privacy Policy</Link>
        </p>

        <AuthDivider label="Or sign up with" />

        <SocialAuthButtons
          disabled={isLoading}
          onGoogle={socialSignUp(registerWithGoogle, 'Google')}
          onLinkedin={socialSignUp(signInWithLinkedin, 'LinkedIn')}
          onDiscord={socialSignUp(signInWithDiscord, 'Discord')}
          onX={socialSignUp(signInWithX, 'X')}
        />
      </form>
    </AuthShell>
  );
}
