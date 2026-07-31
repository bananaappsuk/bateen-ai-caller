import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  listCampaigns,
  deleteCampaign,
  type CampaignRow,
  type CampaignStatus,
} from "@/services/campaignsService";
import { listAgents, type AgentRow } from "@/services/agentsService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Bot,
  PhoneOutgoing,
  Users,
  Settings as SettingsIcon,
  GraduationCap,
  LifeBuoy,
  Lock,
  Megaphone,
  Plus,
  Eye,
  Trash2,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
  Phone,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";
import { useCredits } from "@/lib/creditsContext";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const statusStyles: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  running: "bg-emerald-50 text-emerald-600",
  paused: "bg-amber-50 text-amber-600",
  completed: "bg-cyan-50 text-cyan-600",
};

const CampaignsPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const { credits } = useCredits();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const load = async () => {
    try {
      const [c, a] = await Promise.all([listCampaigns(), listAgents()]);
      setCampaigns(c);
      setAgents(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const agentName = useMemo(() => {
    const map = new Map(agents.map((a) => [a.id, a.name]));
    return (id: string | null) => (id ? map.get(id) ?? "Unknown agent" : "No agent assigned");
  }, [agents]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const openCreate = () => navigate("/dashboard/campaigns/create");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign and all its leads?")) return;
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.campaign_id !== id));
      toast.success("Campaign deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign.");
    }
  };

  const statusOf = (c: CampaignRow) => (c.status as CampaignStatus) ?? "draft";

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
                      isActive
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

      {/* Main */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 text-xs font-semibold">
                  {campaigns.length}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Upload CSVs and automate your outbound calling.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                {credits.toLocaleString()} Credits
              </div>
              <button
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Settings"
                onClick={() => navigate("/dashboard/settings")}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-50 to-purple-50 flex items-center justify-center mb-4">
                <Megaphone className="h-7 w-7 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No Campaigns Yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Create your first campaign to start calling leads.
              </p>
              <button
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.campaign_id}
                  className="bg-white rounded-2xl border-slate-100 shadow-soft hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/dashboard/campaigns/${campaign.campaign_id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center shrink-0">
                        <PhoneOutgoing className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">{campaign.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{agentName(campaign.agent_id)}</p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold capitalize",
                          statusStyles[statusOf(campaign)],
                        )}
                      >
                        {statusOf(campaign)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Leads</p>
                        <p className="text-lg font-semibold text-slate-900 flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-slate-400" />
                          {(campaign.total_leads ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Called</p>
                        <p className="text-lg font-semibold text-slate-900 flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {(campaign.called_leads ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/campaigns/${campaign.campaign_id}`);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> Open
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(campaign.campaign_id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CampaignsPage;
