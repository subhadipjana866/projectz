import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo.svg';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { resendEmailConfirmation, verifyOtp, session, loading, clearSession } = useAuth();
  const otpInputs = useRef([]);

  const email = location.state?.email;
  console.log("session", session); // Debug log to check session data

  // Handle redirect after successful OTP verification
  useEffect(() => {
    if (verified && session) {
      setTimeout(() => {
        navigate('/projects', { replace: true });
      }, 1500);
    }
  }, [verified, session, navigate]);

  // Redirect if no email in location state
  useEffect(() => {
    if (!email && !loading) {
      navigate('/register');
    }
  }, [email, loading, navigate]);

  // Handle resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Email address not found');
      return;
    }

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const data0 = await verifyOtp(email, otpCode);
      
      // Retrieve stored registration data
      const registrationData = JSON.parse(sessionStorage.getItem('registrationData') || '{}');
      
      if (!registrationData.password) {
        throw new Error('Registration data not found. Please register again.');
      }


      // Sign in the user
      // console.log("password from registrationData:", registrationData.password); // Debug log
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: registrationData.password,
      });

      if (signInError) {
        throw new Error(signInError.message || 'Failed to sign in');
      }


      setVerified(true);
      setMessage('✓ OTP verified successfully! Logging you in...');
      
      // Clear stored registration data
      sessionStorage.removeItem('registrationData');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
      
      // Clear session on failed OTP verification
      try {
        await clearSession();
      } catch (clearError) {
        console.error('Error clearing session:', clearError);
      }
      
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Email address not found');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await resendEmailConfirmation(email);
      setMessage('✓ OTP resent! Check your email for the new code.');
      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
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
        {/* Verify Email Card */}
        <div className="backdrop-blur-md bg-[rgba(16,22,34,0.4)] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl p-10 w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Verify Email</h2>
            <p className="text-slate-400">
              {email ? `Enter the OTP code sent to ${email}` : 'Enter the verification code'}
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-6">
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && !verified && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info Message for Testing */}
          {/* <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-6">
            <p className="text-sm text-blue-400">
              <strong>💡 For Testing:</strong> Check your browser's Developer Console (F12 or Cmd+Option+I) to see the OTP code. Look for the green text with the 6-digit code.
            </p>
          </div> */}

          {/* Form */}
          {!verified ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP Input Fields */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">Enter OTP Code</label>
                <div className="flex gap-3 justify-between">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-12 text-center text-2xl font-bold bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue focus:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                      placeholder="•"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isLoading || otp.join('').length !== 6}
                className="w-full mt-8 bg-brand-blue hover:bg-brand-dark-blue disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading || resendCountdown > 0}
                    className="font-semibold text-brand-blue hover:text-brand-dark-blue transition-colors disabled:text-slate-600"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                </p>
              </div>

              {/* Back to Login */}
              <p className="text-center text-slate-400">
                <Link to="/login" className="font-semibold text-brand-blue hover:text-brand-dark-blue transition-colors">
                  Back to Login
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full">
                <span className="text-2xl text-green-400">✓</span>
              </div>
              <p className="text-slate-300">Your email has been verified!</p>
              <p className="text-sm text-slate-500">Redirecting to feed...</p>
            </div>
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
