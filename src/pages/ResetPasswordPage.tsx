import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/ai-tele-caller-logo.png";
import { updatePassword } from "@/lib/devAuth";

// Reached via the link in a "Forgot password" email. Supabase's client
// detects the recovery token in the URL and opens a temporary session
// automatically, letting us call updateUser({ password }) directly.
const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#F5F5F7" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="AI Tele Caller" className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Set a new password</h1>
          <p className="text-sm text-slate-500">Choose a new password for your account.</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-emerald-600">Your password has been updated.</p>
            <Button
              onClick={() => navigate("/login")}
              className="h-12 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90 transition-opacity"
            >
              Go to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              name="new-password"
              autoComplete="new-password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
            />
            <PasswordInput
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
