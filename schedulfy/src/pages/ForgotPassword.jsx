// pages/ForgotPassword.jsx
import { useState } from "react";
import { Mail } from "lucide-react";
import { schedulfy } from "@/api/schedulfyClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Try to call your forgot password endpoint
      const response = await schedulfy.auth.forgotPassword(email);
      // If successful, show sent message
      setSent(true);
    } catch (err) {
      // Always show success regardless (security best practice)
      // But we'll log the error for debugging
      console.error('Forgot password error:', err);
      // Still show success even if there's an error
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground text-center">
          If an account exists with that email, you'll receive a password reset link shortly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="Kingsford@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 w-full border border-border bg-card rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}