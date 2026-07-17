import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/ai-tele-caller-logo.png";
import { signIn, sendPasswordReset } from "@/lib/devAuth";

type Step = "email" | "password";

const LoginPage = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setStep("password");
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email above first.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setInfo(`We've emailed a password reset link to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#F5F5F7" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="AI Tele Caller" className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome back</h1>
          <p className="text-sm text-slate-500">
            {step === "email" ? "Enter your email to continue." : "Sign in with your password."}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleContinue} className="space-y-4">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
            />
            <Button
              type="submit"
              className="h-12 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90 transition-opacity"
            >
              Continue
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 truncate">{email}</span>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setInfo(null); }}
                className="font-medium text-[#00D4FF] hover:underline shrink-0 ml-2"
              >
                Change
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-medium text-[#00D4FF] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
              />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            {info && <p className="text-sm text-emerald-600 text-center">{info}</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          No account yet?{" "}
          <a href="/signup" className="font-semibold text-[#00D4FF] hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
