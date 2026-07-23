import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Bot,
  PhoneOutgoing,
  Users,
  Settings as SettingsIcon,
  GraduationCap,
  LifeBuoy,
  Lock,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";
import { planByTier } from "@/lib/plans";
import { redirectToStripe, changePlan, previewChange, getBillingAccount } from "@/services/creditsService";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const plans = [
  {
    name: "Lite",
    monthlyPrice: 29,
    annualPrice: 24,
    credits: 50,
    agents: 1,
    concurrent: 2,
    leads: 50,
    features: ["Email support", "Basic analytics", "Standard voices"],
    cta: "Start with Lite",
    popular: false,
  },
  {
    name: "Starter",
    monthlyPrice: 249,
    annualPrice: 207,
    credits: 700,
    agents: 2,
    concurrent: 5,
    leads: 250,
    features: ["Ready-made agents", "Email support", "Campaign analytics"],
    cta: "Start 7-day free trial",
    popular: false,
  },
  {
    name: "Growth",
    monthlyPrice: 699,
    annualPrice: 583,
    credits: 2250,
    agents: 5,
    concurrent: 10,
    leads: 1000,
    features: ["Priority support", "Advanced analytics", "Custom voices", "CRM integrations"],
    cta: "Start 7-day free trial",
    popular: true,
  },
  {
    name: "Scale",
    monthlyPrice: 1999,
    annualPrice: 1666,
    credits: 7000,
    agents: "Unlimited" as const,
    concurrent: 20,
    leads: "Unlimited" as const,
    features: ["White-label", "Priority support", "Dedicated CSM", "Custom integrations"],
    cta: "Start 7-day free trial",
    popular: false,
  },
];

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    getBillingAccount()
      .then((a) => {
        setCredits(a?.credits ?? 0);
        setHasSubscription(a?.subscription_status === "active" || a?.subscription_status === "trialing");
      })
      .catch(() => undefined);
  }, []);

  const handleSubscribe = async (planName: string) => {
    const tier = planName.toLowerCase();
    const p = planByTier(tier);
    const priceId = annual ? p?.priceYear : p?.priceMonth;
    if (!priceId) {
      toast.error("Billing isn't configured yet — set your Stripe price IDs (VITE_STRIPE_PRICE_*).");
      return;
    }
    setBusy(tier);
    try {
      if (hasSubscription) {
        // Existing subscriber → preview proration, confirm, then change in place.
        const preview = await previewChange(priceId);
        if (!preview.requiresCheckout) {
          if (!window.confirm(preview.message || "Change to this plan?")) {
            setBusy(null);
            return;
          }
          const msg = await changePlan(priceId, tier, p?.credits ?? 0);
          toast.success(msg);
          setBusy(null);
          setTimeout(() => navigate("/dashboard/settings?tab=Billing"), 1200);
          return;
        }
        // No active subscription after all → fall through to checkout below.
        await redirectToStripe("create-checkout-session", {
          priceId,
          tier,
          monthlyCredits: p?.credits ?? 0,
          trialDays: p?.hasTrial ? 7 : 0,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/plans?checkout=cancelled`,
        });
      } else {
        await redirectToStripe("create-checkout-session", {
          priceId,
          tier,
          monthlyCredits: p?.credits ?? 0,
          trialDays: p?.hasTrial ? 7 : 0,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/plans?checkout=cancelled`,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update plan.");
      setBusy(null);
    }
  };

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB]">
      <aside className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <img src={logo} alt="AI Tele Caller" className="h-8 w-auto" />
          <span className="font-semibold text-slate-900 tracking-tight">AI Tele Caller</span>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )
                  }
                  end={item.href === "/dashboard"}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user.role} · {user.email}
                </p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate("/dashboard/settings?tab=Billing")}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Billing
              </button>
              <h1 className="text-3xl font-bold text-slate-900">Choose Your Plan</h1>
              <p className="text-sm text-slate-500 mt-1">
                Pick a plan that scales with your outbound calling.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                {credits.toLocaleString()} Credits
              </div>
              <button
                onClick={() => navigate("/dashboard/settings?tab=Billing")}
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 my-10">
            <span className={cn("text-sm font-medium", !annual ? "text-slate-900" : "text-slate-500")}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{ backgroundColor: annual ? "#FF6FD8" : "#e2e8f0" }}
              aria-label="Toggle annual billing"
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: annual ? "translateX(28px)" : "translateX(0)" }}
              />
            </button>
            <span className={cn("text-sm font-medium", annual ? "text-slate-900" : "text-slate-500")}>
              Annual
            </span>
            {annual && (
              <span className="text-xs font-semibold text-pink-600 bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                Save 2 months
              </span>
            )}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col p-7 rounded-2xl border bg-white transition-all",
                  plan.popular
                    ? "border-pink-200 shadow-lg xl:scale-[1.02]"
                    : "border-slate-100 shadow-sm hover:shadow-md"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-3 py-1 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">
                      ${annual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-sm text-slate-500">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-slate-500 mt-1">
                      Billed annually (${plan.annualPrice * 12}/year)
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-3 mb-6 text-sm text-slate-600">
                  <Row label="Credits/month" value={plan.credits} />
                  <Row label="AI Agents" value={plan.agents} />
                  <Row label="Concurrent Calls" value={plan.concurrent} />
                  <Row label="Leads per Upload" value={plan.leads} />
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={busy !== null}
                  className={cn(
                    "w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60",
                    plan.popular
                      ? "bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {busy === plan.name.toLowerCase()
                    ? "Working…"
                    : hasSubscription
                      ? "Switch to this plan"
                      : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

export default ChoosePlanPage;
