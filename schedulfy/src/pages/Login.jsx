// pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Mail, Lock, Loader2, Sparkles, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, setAuthToken, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    const googleToken = new URLSearchParams(location.search).get('google_token');
    const googleError = new URLSearchParams(location.search).get('google_error');
    if (googleError) {
      setError(googleError);
      window.history.replaceState({}, document.title, '/login');
      return;
    }
    if (googleToken) {
      setAuthToken(googleToken);
      checkUserAuth().then(() => navigate(redirect, { replace: true }));
      return;
    }
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, location.search, redirect, setAuthToken, checkUserAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(redirect);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-10">
      {/* ── LEFT PANEL ── */}
      <div className="hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 w-full h-full opacity-30 pointer-events-none select-none">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-cyan/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span className="font-display text-2xl font-bold tracking-widest text-white">SCHEDULFY</span>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-white/70 text-xl font-light leading-snug max-w-xs">
            Navigating schedules<br />with smart simplicity.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full max-w-[440px]">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-[#1877f2]">
              <Sparkles className="w-7 h-7" />
              <span className="font-display text-4xl font-bold tracking-wide">SCHEDULFY</span>
            </div>
            <p className="mt-2 text-base font-medium text-gray-700">Stay organized. Move forward.</p>
          </div>

          <div className="relative bg-white rounded-lg shadow-md border border-gray-200 p-5 sm:p-6">
            <div className="mb-7">
              <h1 className="text-xl font-semibold text-gray-900 text-center">Log in to Schedulfy</h1>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full h-11 flex items-center justify-center gap-2.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50 transition-colors mb-5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-600 font-semibold tracking-wider">or</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-gray-900 text-sm font-semibold">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 h-12 border border-gray-300 bg-white focus:bg-white rounded-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-gray-900 text-sm font-semibold">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-700 font-medium hover:text-indigo-900 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 h-12 border border-gray-300 bg-white focus:bg-white rounded-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-md bg-[#1877f2] hover:bg-[#166fe5] text-white text-base font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Log in</>
                )}
              </button>
            </form>

          </div>

          <p className="text-center text-sm font-medium text-gray-700 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#1877f2] font-semibold hover:text-[#166fe5] hover:underline">
              Create one
            </Link>
          </p>
      </div>
    </div>
  );
}