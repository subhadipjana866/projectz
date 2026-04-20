import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.svg';
import './ForgotPassword.css';

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
      let errorMessage = 'Failed to send reset email. Please try again.';
      
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
            <h2 className="text-4xl font-bold text-white mb-2">Forgot Password?</h2>
            <p className="text-slate-400">No worries! We'll send you a link to reset it.</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-6">
              <p className="text-sm text-green-400">
                ✓ Check your email for password reset instructions. Redirecting to login...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <span className="text-2xl text-green-400">✓</span>
              </div>
              <p className="text-slate-300 mb-4">Check your email!</p>
              <p className="text-sm text-slate-400 mb-6">We've sent you a password reset link. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 pl-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 bg-brand-blue hover:bg-brand-dark-blue disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* Links */}
          <div className="space-y-3 mt-8">
            <p className="text-center text-slate-400">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-brand-blue hover:text-brand-dark-blue transition-colors">
                Sign In
              </Link>
            </p>
            <p className="text-center text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-brand-blue hover:text-brand-dark-blue transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex items-center justify-center py-6 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-sm text-slate-500">© 2024 CollabHub. All rights reserved.</p>
      </div>
    </div>
  );
}
