import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDevUser } from "@/lib/devAuth";
import { listAgents } from "@/services/agentsService";
import { listCampaigns } from "@/services/campaignsService";
import { Bot, PhoneOutgoing, Users, Rocket, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [hasAgent, setHasAgent] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasCampaign, setHasCampaign] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [agents, campaigns] = await Promise.all([listAgents(), listCampaigns()]);
        setHasAgent(agents.length > 0);
        setHasNumber(agents.some((a) => !!a.phone_number));
        setHasCampaign(campaigns.length > 0);
      } catch {
        // ignore
      }
    })();
  }, []);

  const steps = [
    {
      title: "Create your first AI agent",
      desc: "Pick a voice and write your call script.",
      done: hasAgent,
      cta: "Create agent",
      route: "/ai-agents/create",
      icon: Bot,
    },
    {
      title: "Attach a phone number",
      desc: "Give your agent a number so it can place calls.",
      done: hasNumber,
      cta: "Assign a number",
      route: "/ai-agents",
      icon: PhoneOutgoing,
    },
    {
      title: "Upload leads & launch a campaign",
      desc: "Import a CSV and point your agent at it.",
      done: hasCampaign,
      cta: "New campaign",
      route: "/dashboard/campaigns/create",
      icon: Users,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[#F5F5F7]">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="AI Tele Caller" className="h-14 w-auto mb-5" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome{user ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Three quick steps and your AI will be dialing. {completed}/3 done.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border bg-white transition-shadow",
                step.done ? "border-emerald-200" : "border-slate-100 shadow-sm hover:shadow-md",
              )}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  step.done ? "bg-emerald-50 text-emerald-600" : "bg-cyan-50 text-cyan-600",
                )}
              >
                {step.done ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {i + 1}. {step.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              </div>
              {!step.done && (
                <button
                  onClick={() => navigate(step.route)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-95"
                >
                  {step.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-8 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Rocket className="h-4 w-4" /> Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
