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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Mic,
  Plus,
  Eye,
  Trash2,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
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

interface Agent {
  id: string;
  internalName: string;
  agentId: string;
  phoneNumber: string;
}

const STORAGE_KEY = "linked_ai_agents_list";

const loadAgents = (): Agent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const AIAgentsPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [agents, setAgents] = useState<Agent[]>(loadAgents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [form, setForm] = useState({ internalName: "", agentId: "", phoneNumber: "" });

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  }, [agents]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const openConnect = () => {
    setForm({ internalName: "", agentId: "", phoneNumber: "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { internalName, agentId, phoneNumber } = form;
    if (!internalName.trim() || !agentId.trim() || !phoneNumber.trim()) return;
    setAgents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        internalName: internalName.trim(),
        agentId: agentId.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    ]);
    setForm({ internalName: "", agentId: "", phoneNumber: "" });
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this linked agent?")) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
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

      {/* Main */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Voice Agents</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 text-xs font-semibold">
                  {agents.length}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Manage your linked AI voice agents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                0 Credits
              </div>
              <button
                className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <Button
                onClick={openConnect}
                className="inline-flex items-center gap-2 px-4 py-2 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Connect via Agent ID
              </Button>
            </div>
          </div>

          {/* Content */}
          {agents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-50 to-purple-50 flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No Agents Linked</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                You haven't linked any voice agents yet. Connect your first agent to get started.
              </p>
              <Button
                onClick={openConnect}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Connect via Agent ID
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card
                  key={agent.id}
                  className="bg-white rounded-2xl border-slate-100 shadow-soft hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">{agent.internalName}</h3>
                        <p className="text-xs text-slate-500 truncate">{agent.agentId}</p>
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Agent ID:</span> {agent.agentId}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Phone:</span> {agent.phoneNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setViewing(agent)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => handleDelete(agent.id)}
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

      {/* Link Agent dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Link New Agent</DialogTitle>
            <DialogDescription>
              Enter the Agent ID from your provider dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internalName">Internal Name</Label>
              <Input
                id="internalName"
                value={form.internalName}
                onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                placeholder="e.g., Sales Bot v1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                value={form.agentId}
                onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                placeholder="agent_..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (E.164 Format)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="+1234567890"
                required
              />
              <p className="text-xs text-slate-500">
                Enter the phone number connected to this agent (e.g., +1234567890)
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
              >
                Connect Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{viewing?.internalName}</DialogTitle>
            <DialogDescription>{viewing?.agentId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Internal Name</p>
              <p className="text-slate-900 mt-1">{viewing?.internalName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent ID</p>
              <p className="text-slate-900 mt-1">{viewing?.agentId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</p>
              <p className="text-slate-900 mt-1">{viewing?.phoneNumber}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAgentsPage;
