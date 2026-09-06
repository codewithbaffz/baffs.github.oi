// pages/Register.jsx
import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Mail, Lock, Loader2, UserPlus, User } from "lucide-react"; // ✅ Added User icon
import AuthLayout from "@/components/AuthLayout";
import schedulfySDK from "@/lib/sdk";

// Google Icon Component
const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// OTP Input with proper state handling
const InputOTPSlot = ({ index, value, onChange, onKeyDown }) => (
  <input
    type="text"
    maxLength={1}
    data-index={index}
    value={value || ''}
    onChange={(e) => onChange(index, e.target.value)}
    onKeyDown={(e) => onKeyDown(index, e)}
    className="w-12 h-14 text-center text-xl font-bold border border-border rounded-xl bg-card focus:bg-white/90 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
  />
);

const InputOTPGroup = ({ children }) => (
  <div className="flex gap-2">{children}</div>
);

const InputOTP = ({ value, onChange }) => {
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const handleChange = (index, val) => {
    if (val.length > 1) return;
    
    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);
    onChange(newOtp.join(''));

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  React.useEffect(() => {
    if (value && value.length === 6) {
      const newOtp = value.split('');
      setOtpValues(newOtp);
    }
  }, [value]);

  return (
    <div className="flex justify-center gap-2 mb-6">
      <InputOTPGroup>
        {otpValues.map((val, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            value={val}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            ref={(el) => (inputRefs.current[index] = el)}
          />
        ))}
      </InputOTPGroup>
    </div>
  );
};

export default function Register() {
  const [name, setName] = useState(""); // ✅ Added name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  const { checkUserAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // ✅ Validate name
    if (!name.trim()) {
      setError("Full name is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      console.log('Registering user:', { name, email });
      
      // ✅ Send name, email, and password
      const response = await schedulfySDK.auth.register({ 
        name: name.trim(),
        email, 
        password 
      });
      console.log('Registration response:', response);
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        await checkUserAuth();
        navigate(redirect);
      } else if (response.requiresVerification || response.message?.includes('verify')) {
        setShowOtp(true);
      } else {
        setShowOtp(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.message?.toLowerCase().includes('verify') || 
          err.message?.toLowerCase().includes('otp')) {
        setShowOtp(true);
        setError("");
      } else {
        setError(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      console.log('Verifying OTP:', { email, otpCode });
      const result = await schedulfySDK.auth.verifyOtp({ email, otpCode });
      console.log('Verification response:', result);
      
      if (result?.access_token || result?.token) {
        localStorage.setItem('authToken', result.token || result.access_token);
        await checkUserAuth();
        navigate(redirect);
      } else {
        setError("Verification successful but no token received");
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await schedulfySDK.auth.resendOtp(email);
      alert("Code sent! Check your email.");
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      window.location.href = `${apiBase}/auth/google`;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Unable to continue with Google');
      setLoading(false);
    }
  };

  // OTP Verification View
  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <InputOTP value={otpCode} onChange={setOtpCode} />
        <button
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            "Verify"
          )}
        </button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  // Main Registration View
  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <button
        className="w-full h-12 text-sm font-medium border border-border rounded-xl bg-card hover:bg-secondary/50 transition-colors mb-6 flex items-center justify-center gap-2"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ✅ Name Field - Added */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-12 w-full border border-border bg-card rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 w-full border border-border bg-card rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 w-full border border-border bg-card rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              required
              minLength={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12 w-full border border-border bg-card rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              required
              minLength={8}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}