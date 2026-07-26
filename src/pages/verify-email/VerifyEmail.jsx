import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { pathAfterAuth } from '../../lib/routing';
import { AuthShell } from '../../components/ui';

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

  // Handle redirect after successful OTP verification
  useEffect(() => {
    if (verified && session) {
      setTimeout(async () => {
        const path = await pathAfterAuth(session.user.id);
        navigate(path, { replace: true });
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
      await verifyOtp(email, otpCode);

      // Retrieve stored registration data
      const registrationData = JSON.parse(sessionStorage.getItem('registrationData') || '{}');

      if (!registrationData.password) {
        throw new Error('Registration data not found. Please register again.');
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: registrationData.password,
      });

      if (signInError) {
        throw new Error(signInError.message || 'Failed to sign in');
      }

      setVerified(true);
      setMessage('✓ OTP verified successfully! Logging you in…');

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
    <AuthShell headerAction={<Link to="/login" className="btn-secondary btn-md">Sign in</Link>}>
      <div className="text-left mb-9">
        <p className="eyebrow mb-2">One last step</p>
        <h2 className="font-display text-4xl font-bold text-white">Verify your email</h2>
        <p className="mt-3 text-slate-400">
          {email ? <>Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span></> : 'Enter the verification code'}
        </p>
      </div>

      {message && <div className="alert-success mb-6">{message}</div>}
      {error && !verified && <div className="alert-error mb-6">{error}</div>}

      {!verified ? (
        <form onSubmit={handleVerifyOtp} className="space-y-7">
          {/* OTP Input Fields */}
          <div>
            <label className="field-label mb-3">Enter OTP Code</label>
            <div className="flex gap-2.5 sm:gap-3 justify-between">
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
                  className="w-12 h-14 text-center text-2xl font-bold font-display bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-600 outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/25 focus:bg-white/[0.07] transition-all disabled:opacity-50"
                  placeholder="•"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className="btn-primary btn-lg w-full"
          >
            {isLoading ? 'Verifying…' : 'Verify OTP'}
          </button>

          <div className="text-center text-sm text-slate-400 space-y-2.5">
            <p>
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || resendCountdown > 0}
                className="font-semibold text-primary-400 hover:text-primary-300 transition-colors disabled:text-slate-600"
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
              </button>
            </p>
            <p>
              <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                Back to Login
              </Link>
            </p>
          </div>
        </form>
      ) : (
        <div className="glass p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-full mb-5">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Your email has been verified!</p>
          <p className="text-sm text-slate-400 mt-2">Redirecting to your feed…</p>
        </div>
      )}
    </AuthShell>
  );
}
