import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { retellService, type RetellPhoneNumber } from "@/services/retellService";
import {
  getAgent,
  updateAgent,
  getPhoneNumberLinkStatus,
  type AgentRow,
  type PhoneNumberLinkStatus,
} from "@/services/agentsService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Loader2,
  Phone,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const LinkNumberPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getDevUser();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<RetellPhoneNumber[]>([]);
  const [linkStatus, setLinkStatus] = useState<Record<string, PhoneNumberLinkStatus>>({});
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const a = await getAgent(id);
        if (!a) {
          toast.error("Agent not found.");
          navigate("/ai-agents");
          return;
        }
        setAgent(a);
        setSelectedNumber(a.phone_number ?? "");
        const numbers = await retellService.listPhoneNumbers().catch(() => []);
        setPhoneNumbers(numbers);
        const statuses = await getPhoneNumberLinkStatus(numbers.map((n) => n.phone_number)).catch(() => []);
        setLinkStatus(Object.fromEntries(statuses.map((s) => [s.phone_number, s])));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load numbers.");
        navigate("/ai-agents");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };
  const handleCancel = () => navigate("/ai-agents");

  const isTakenElsewhere = (phone: string) => {
    const status = linkStatus[phone];
    return !!status && status.agent_id !== agent?.id;
  };

  const agentHasActiveCampaign =
    !!agent?.phone_number && linkStatus[agent.phone_number]?.has_active_campaign === true;

  const friendlyError = (err: unknown): string => {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return "That number was just linked to another agent — pick a different one.";
    if (code === "23514" || code === "check_violation") {
      return "This agent has an active campaign — stop, finish, or delete it before changing its number.";
    }
    return err instanceof Error ? err.message : "Failed to update the linked number.";
  };

  // Push the local link/unlink decision to Retell's own phone-number binding
  // too — otherwise the next "Sync from Retell" (which reads Retell's binding
  // as the source of truth) silently reverts our local change back.
  const pushRetellBinding = async (
    phoneNumber: string,
    target: { agentId: string; agentVersion?: number | null } | null,
  ) => {
    await retellService.setPhoneNumberAgent(phoneNumber, target);
  };

  const handleSave = async () => {
    if (!agent) return;
    const next = selectedNumber || null;
    const previous = agent.phone_number ?? null;
    if (next === previous) {
      navigate("/ai-agents");
      return;
    }
    if (next && isTakenElsewhere(next)) {
      toast.error(`That number is already linked to "${linkStatus[next].agent_name}".`);
      return;
    }
    if (agentHasActiveCampaign) {
      toast.error("This agent has an active campaign — stop, finish, or delete it before changing its number.");
      return;
    }
    if (!agent.retell_agent_id) {
      toast.error("This agent isn't synced with Retell — nothing to link it to.");
      return;
    }
    setSaving(true);
    try {
      await updateAgent(agent.id, { phone_number: next });
      try {
        if (next) {
          const remote = await retellService.getAgent(agent.retell_agent_id);
          await pushRetellBinding(next, { agentId: agent.retell_agent_id, agentVersion: remote.version ?? 0 });
          if (previous) await pushRetellBinding(previous, null);
        } else if (previous) {
          await pushRetellBinding(previous, null);
        }
      } catch (retellErr) {
        // Roll back the local write so the DB and Retell never disagree.
        await updateAgent(agent.id, { phone_number: previous }).catch(() => undefined);
        throw retellErr;
      }
      toast.success(next ? "Number linked." : "Number unlinked.");
      navigate("/ai-agents");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!agent?.phone_number) return;
    if (agentHasActiveCampaign) {
      toast.error("This agent has an active campaign — stop, finish, or delete it before unlinking its number.");
      return;
    }
    const previous = agent.phone_number;
    setSaving(true);
    try {
      await updateAgent(agent.id, { phone_number: null });
      try {
        await pushRetellBinding(previous, null);
      } catch (retellErr) {
        await updateAgent(agent.id, { phone_number: previous }).catch(() => undefined);
        throw retellErr;
      }
      toast.success("Number unlinked.");
      navigate("/ai-agents");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB]">
      {/* Sidebar */}
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
                      isActive || item.href === "/ai-agents"
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
                <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[260px] h-screen flex flex-col">
        <div className="shrink-0 bg-white border-b border-slate-100 px-6 sm:px-10 py-5">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Back to Voice Agents"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Link Phone Number</h1>
              <p className="text-sm text-slate-500 truncate">
                {agent ? `For ${agent.name}` : "Loading…"} — numbers are shared across every agent, one at a time.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 sm:px-10 py-6 space-y-4">
                {agentHasActiveCampaign && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This agent has an active campaign — its number can't be changed or unlinked until that campaign
                    is stopped, finished, or deleted.
                  </p>
                )}

                {phoneNumbers.length === 0 ? (
                  <p className="text-sm text-slate-500">No phone numbers found on your Retell account.</p>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 overflow-hidden">
                    {phoneNumbers.map((p) => {
                      const taken = isTakenElsewhere(p.phone_number);
                      const isSelected = selectedNumber === p.phone_number;
                      const disabled = taken || agentHasActiveCampaign;
                      return (
                        <button
                          key={p.phone_number}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedNumber(p.phone_number)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer",
                            isSelected && !disabled ? "bg-cyan-50/60" : "",
                          )}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                              isSelected && !disabled ? "border-cyan-500 bg-cyan-500" : "border-slate-300",
                            )}
                          >
                            {isSelected && !disabled && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 font-mono">
                              {p.phone_number_pretty ?? p.phone_number}
                            </p>
                            {p.nickname && p.nickname !== p.phone_number && (
                              <p className="text-xs text-slate-500 truncate">{p.nickname}</p>
                            )}
                          </div>
                          {taken && (
                            <span className="shrink-0 text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                              Linked to {linkStatus[p.phone_number].agent_name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 bg-white border-t border-slate-100 px-6 sm:px-10 py-4">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div>
                  {agent?.phone_number && (
                    <Button
                      variant="outline"
                      onClick={handleUnlink}
                      disabled={saving || agentHasActiveCampaign}
                      className="text-red-600 hover:text-red-700"
                    >
                      Unlink
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || agentHasActiveCampaign}
                    className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
                  >
                    {saving ? "Saving…" : "Link"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default LinkNumberPage;
