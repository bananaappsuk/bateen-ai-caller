import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RetellWebClient } from "retell-client-js-sdk";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { retellService, RetellApiError } from "@/services/retellService";
import {
  listAgents,
  syncAgentsFromRetell,
  deleteAgent as deleteAgentRow,
  type AgentRow,
} from "@/services/agentsService";
import { supabase } from "@/integrations/supabase/client";
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
  Trash2,
  PhoneCall,
  Loader2,
  LogOut,
  ChevronsUpDown,
  RefreshCw,
  PhoneOff,
  Phone,
  Pencil,
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

const AIAgentsPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  const load = async () => {
    try {
      setAgents(await listAgents());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Auto-sync from Retell on first load so existing agents appear.
      setSyncing(true);
      try {
        await syncAgentsFromRetell();
      } catch {
        // ignore — show whatever is in the DB
      } finally {
        setSyncing(false);
      }
      await load();
    })();
    return () => {
      try {
        retellClientRef.current?.stopCall();
      } catch {
        // ignore
      }
      retellClientRef.current = null;
    };
  }, []);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));
  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { synced } = await syncAgentsFromRetell();
      await load();
      toast.success(`Synced ${synced} agent${synced === 1 ? "" : "s"} from Retell.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const stopActiveCall = () => {
    try {
      retellClientRef.current?.stopCall();
    } catch {
      // ignore
    }
    retellClientRef.current = null;
    activeAgentIdRef.current = null;
    setActiveCallId(null);
    setTestingId(null);
  };

  const handleTest = async (agent: AgentRow) => {
    if (activeAgentIdRef.current === agent.id) {
      stopActiveCall();
      toast("Test call ended.");
      return;
    }
    if (!agent.retell_agent_id) {
      toast.error("This agent is not synced with Retell.");
      return;
    }
    setTestingId(agent.id);
    const loadingId = toast.loading("Starting test call…");
    try {
      const call = await retellService.createWebCall({ agent_id: agent.retell_agent_id });
      if (!call?.call_id) throw new RetellApiError("Retell did not return a call_id.");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("Microphone permission is required for a test call.");
      }

      const client = new RetellWebClient();
      retellClientRef.current = client;
      client.on("call_started", () => toast.success("Call connected."));
      client.on("call_ended", () => {
        toast("Call ended.");
        stopActiveCall();
      });
      client.on("error", (e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Call error.");
        stopActiveCall();
      });
      await client.startCall({ accessToken: call.access_token });

      activeAgentIdRef.current = agent.id;
      setActiveCallId(call.call_id);
      toast.success(`Test call started.`, { id: loadingId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start test call.", { id: loadingId });
      activeAgentIdRef.current = null;
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (agent: AgentRow) => {
    if (!confirm(`Delete "${agent.name}"?`)) return;
    try {
      if (agent.retell_agent_id) {
        await retellService.deleteAgent(agent.retell_agent_id).catch(() => undefined);
      }
      await deleteAgentRow(agent.id);
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      toast.success("Agent deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete agent.");
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
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Voice Agents</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 text-xs font-semibold">
                  {agents.length}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Create voice agents or sync existing ones from Retell.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync from Retell
              </button>
              <Button
                onClick={() => navigate("/ai-agents/create")}
                className="inline-flex items-center gap-2 px-4 py-2 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </div>

          {loading || syncing ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-50 to-purple-50 flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No Agents Yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Create a new voice agent, or sync ones you already have on Retell.
              </p>
              <Button
                onClick={() => navigate("/ai-agents/create")}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card key={agent.id} className="bg-white rounded-2xl border-slate-100 shadow-soft hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">{agent.name}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {agent.retell_voice_id ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {agent.phone_number ? (
                          agent.phone_number
                        ) : (
                          <button
                            onClick={() => navigate(`/ai-agents/${agent.id}/number`)}
                            className="text-cyan-600 hover:underline"
                          >
                            Assign a number
                          </button>
                        )}
                      </div>
                      {agent.deleted_in_retell && (
                        <div className="text-xs text-amber-600">Removed in Retell</div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/ai-agents/${agent.id}/edit`)}
                        disabled={!agent.retell_agent_id}
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => navigate(`/ai-agents/${agent.id}/number`)}
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" /> Number
                      </button>
                      <button
                        onClick={() => handleTest(agent)}
                        disabled={testingId !== null && testingId !== agent.id}
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-cyan-600 hover:bg-cyan-50 transition-colors disabled:opacity-50"
                      >
                        {testingId === agent.id ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</>
                        ) : activeCallId && activeAgentIdRef.current === agent.id ? (
                          <><PhoneOff className="h-3.5 w-3.5" /> End</>
                        ) : (
                          <><PhoneCall className="h-3.5 w-3.5" /> Test</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Active call indicator */}
      <Dialog open={!!activeCallId} onOpenChange={(o) => !o && stopActiveCall()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Test call in progress</DialogTitle>
            <DialogDescription>
              Your browser is connected to the Retell agent. Speak to test the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center mb-4 animate-pulse">
              <PhoneCall className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {agents.find((a) => a.id === activeAgentIdRef.current)?.name ?? "Agent"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={stopActiveCall} className="w-full">
              <PhoneOff className="h-4 w-4 mr-2" /> End call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAgentsPage;
