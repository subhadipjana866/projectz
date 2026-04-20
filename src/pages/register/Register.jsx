import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.svg';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'creator',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, registerWithGoogle, signInWithX, signInWithDiscord, signInWithLinkedin } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name|| !formData.email || !formData.password || !formData.confirm_password || !formData.role) {
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
      // console.log('Sign up response:', response);
      // if (response) {
        navigate('/verify-email', { state: { email: formData.email } });
      // }
    } catch (err) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setIsLoading(true);
      await registerWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google');
      setIsLoading(false);
    }
  };

  const handleXSignUp = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithX();
    } catch (err) {
      setError(err.message || 'Failed to sign up with X');
      setIsLoading(false);
    }
  };

  const handleDiscordSignUp = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithDiscord();
    } catch (err) {
      setError(err.message || 'Failed to sign up with Discord');
      setIsLoading(false);
    }
  };

  const handleLinkedinSignUp = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithLinkedin();
    } catch (err) {
      setError(err.message || 'Failed to sign up with LinkedIn');
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
        {/* Registration Card */}
        <div className="backdrop-blur-md bg-[rgba(16,22,34,0.4)] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl p-10 w-full max-w-[32rem]">
          {/* Heading */}
          <div className="mb-4 text-left">
            <h2 className="text-4xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-400">Join our exclusive community of innovators.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <Link
          to="/login"
          className="flex text-center items-center gap-2 text-slate-300 mb-4"
        >
          <span className="text-sm">Already have an account?</span>
          <span className="text-sm font-semibold text-brand-blue hover:text-brand-dark-blue">Login</span>
        </Link>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Row */}
            <div className="text-left">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 pl-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Jane"
                  className="w-full px-5 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
              </div>
              
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2 pl-1">I am a:</label>
              <div className="flex gap-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange('creator')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    formData.role === 'creator'
                      ? 'bg-brand-blue text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                  </svg>
                  Creator
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('brand')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    formData.role === 'brand'
                      ? 'bg-brand-blue text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                  </svg>
                  Brand
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('agency')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    formData.role === 'brand'
                      ? 'bg-brand-blue text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                  </svg>
                  Agency
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('production')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    formData.role === 'brand'
                      ? 'bg-brand-blue text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                  </svg>
                  Production
                </button>
              </div>
            </div>

            {/* Email */}
            <div >
              <label className="block text-left text-sm font-semibold text-slate-200 mb-2 pl-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="jane@example.com"
                className="w-full px-5 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-left text-sm font-semibold text-slate-200 mb-2 pl-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a strong password"
                  className="w-full px-5 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 0 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-left text-slate-400 mt-2">At least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-left text-sm font-semibold text-slate-200 mb-2 pl-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  className="w-full px-5 py-3 bg-white text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 0 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-brand-blue hover:bg-brand-dark-blue disabled:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2 group"
            >
              Get Started
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>

            {/* Terms & Privacy */}
            <p className="text-center text-xs text-slate-400">
              By clicking "Get Started", you agree to our{' '}
              <Link to="#" className="text-brand-blue hover:text-brand-dark-blue">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="#" className="text-brand-blue hover:text-brand-dark-blue">
                Privacy Policy
              </Link>
            </p>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(255,255,255,0.1)]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-[rgba(16,22,34,0.4)] text-slate-400 text-xs uppercase font-semibold">Or sign up with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-xs font-medium">Google</span>
              </button>

              <button
                type="button"
                onClick={handleLinkedinSignUp}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.14.92-2.063 2.063-2.063 1.14 0 2.064.923 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-xs font-medium">LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={handleDiscordSignUp}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 127.14 96.36" fill="white">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0A105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a77.15,77.15,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60.55,31,53.88s5-11.8,11.43-11.8S53.89,46.13,53.89,52.79s-5.22,11.9-11.44,11.9Zm42.24,0C78.41,65.69,73.25,60.55,73.25,53.88s5-11.8,11.44-11.8S96.12,46.13,96.12,52.79s-5.20,11.9-11.43,11.9Z"/>
                </svg>
                <span className="text-xs font-medium">Discord</span>
              </button>

              <button
                type="button"
                onClick={handleXSignUp}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.627l-5.1-6.657-5.856 6.657H2.306l7.644-8.74L1.126 2.25h6.802l4.759 6.285L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117l12.926 15.644z"/>
                </svg>
                <span className="text-xs font-medium">X</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex items-center justify-center py-6 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-sm text-slate-500">© 2024 CollabHub. All rights reserved.</p>
      </div>
    </div>
  );
}
