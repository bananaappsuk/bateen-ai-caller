import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/ai-tele-caller-logo.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#F5F5F7" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="AI Tele Caller" className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500">
            Enter your email and we'll send you a sign-in code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded-xl border-slate-200 px-4 text-base focus-visible:ring-[#00D4FF]"
          />
          <Button
            type="submit"
            className="h-12 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-90 transition-opacity"
          >
            Send code
          </Button>
        </form>

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
