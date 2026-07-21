import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext.jsx";
import { Mail, Lock, Loader2, Sparkles, UserPlus } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { schedulfy } from "@/api/schedulfyClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await schedulfy.auth.login(email, password);
      localStorage.setItem('authToken', response.token);
      await checkUserAuth();
      navigate("/");
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await schedulfy.auth.login('demo@schedulfy.com', 'password123');
      localStorage.setItem('authToken', response.token);
      await checkUserAuth();
      navigate("/");
    } catch (err) {
      setError(err.message || 'Unable to continue with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL - Hidden on mobile, visible on large screens */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col justify-between p-10 relative min-h-screen"
        style={{ background: 'linear-gradient(160deg, #0d1117 0%, #0f1729 50%, #111d3a 100%)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-navy/60 to-cyan-900/30" />

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

      {/* RIGHT PANEL - With proper scrolling */}
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f8] px-4 sm:px-6 py-6 sm:py-10 overflow-y-auto min-h-screen">
        <div className="w-full max-w-md my-8 lg:my-0">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-display text-xl font-bold tracking-widest text-foreground">SCHEDULFY</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Schedulfy</h1>
              <p className="text-gray-500 text-sm mt-1">Log in to your Schedulfy account</p>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors mb-4 disabled:opacity-50"
            >
              <GoogleIcon className="w-4 h-4" />
              Continue with Google
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 tracking-wider">or</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-gray-700 text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 w-full border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 text-sm font-medium">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 w-full border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
                ) : (
                  "Log in"
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">🔑 Demo: demo@schedulfy.com / password123</p>
            </div>

            {/* CREATE ACCOUNT BUTTON */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <Link to="/register">
                <button className="w-full h-11 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create New Account
                </button>
              </Link>
            </div>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}