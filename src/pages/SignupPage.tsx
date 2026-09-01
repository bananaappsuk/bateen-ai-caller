import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/devAuth";
import logo from "@/assets/ai-tele-caller-logo.png";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password, name.trim() || email.split("@")[0]);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#F5F5F7" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="AI Tele Caller" className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create your account</h1>
          <p className="text-sm text-slate-500">No setup fees. Your first campaign can dial today.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
          />
          <Input
            type="email"
            name="username"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
          />
          <PasswordInput
            name="password"
            autoComplete="new-password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-[#00D4FF] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
