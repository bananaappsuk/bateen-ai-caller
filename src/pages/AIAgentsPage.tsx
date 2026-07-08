import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RetellWebClient } from "retell-client-js-sdk";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { retellService, RetellApiError } from "@/services/retellService";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PhoneCall,
  Loader2,
  LogOut,
  ChevronsUpDown,
  CreditCard,
  Settings,
  Link2,
  PhoneOff,
  PhoneForwarded,
  CalendarCheck,
  Voicemail,
  Gauge,
  Waves,
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
  kind: "linked" | "created";
  internalName: string;
  agentId?: string;
  phoneNumber?: string;
  preset?: string;
  voice?: string;
  prompt?: string;
  ambience?: string;
  responseSpeed?: number;
  hangUpOnVoicemail?: boolean;
  endCallAutomatically?: boolean;
  bookCalSlot?: boolean;
  transferToHuman?: boolean;
  // Retell linkage (internal, not shown in UI unless a placeholder already exists)
  retellAgentId?: string;
  retellAgentVersion?: number;
  retellVoiceId?: string;
  lastSync?: string;
  syncStatus?: "synced" | "pending" | "error";
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

const PRESETS = [
  { id: "sales", label: "Sales Outreach", desc: "Qualify leads and book meetings" },
  { id: "support", label: "Customer Support", desc: "Answer questions and resolve issues" },
  { id: "survey", label: "Survey / Feedback", desc: "Collect responses from customers" },
  { id: "reminder", label: "Appointment Reminder", desc: "Confirm and reschedule bookings" },
];

const VOICES = [
  { id: "mia", label: "Mia — Warm female (EN-US)" },
  { id: "salma", label: "Salma — Professional female (EN-GB)" },
  { id: "sarah", label: "Sarah — Friendly female (EN-AU)" },
  { id: "james", label: "James — Confident male (EN-US)" },
];

const AMBIENCES = [
  { id: "none", label: "None (silent)" },
  { id: "office", label: "Office background" },
  { id: "cafe", label: "Cafe" },
  { id: "callcenter", label: "Call center" },
];

const defaultCreateForm = {
  preset: "sales",
  voice: "mia",
  internalName: "",
  prompt: "",
  ambience: "none",
  responseSpeed: 5,
  hangUpOnVoicemail: true,
  endCallAutomatically: true,
  bookCalSlot: false,
  transferToHuman: false,
};

const AIAgentsPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [agents, setAgents] = useState<Agent[]>(loadAgents);
  const [linkOpen, setLinkOpen] = useState(false);
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [linkForm, setLinkForm] = useState({ internalName: "", agentId: "", phoneNumber: "" });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);

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

  const openLink = () => {
    setLinkForm({ internalName: "", agentId: "", phoneNumber: "" });
    setLinkOpen(true);
  };

  const openCreate = () => navigate("/ai-agents/create");

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { internalName, agentId, phoneNumber } = linkForm;
    if (!internalName.trim() || !agentId.trim() || !phoneNumber.trim()) return;
    setAgents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kind: "linked",
        internalName: internalName.trim(),
        agentId: agentId.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    ]);
    setLinkOpen(false);
  };


  const handleDelete = (id: string) => {
    if (confirm("Delete this agent?")) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
    }
  };

  useEffect(() => {
    return () => {
      try {
        retellClientRef.current?.stopCall();
      } catch {
        // ignore
      }
      retellClientRef.current = null;
    };
  }, []);

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

  const handleTest = async (agent: Agent) => {
    // If this agent's call is already active, treat click as "End test call".
    if (activeAgentIdRef.current === agent.id) {
      stopActiveCall();
      toast("Test call ended.");
      return;
    }

    const retellAgentId =
      agent.retellAgentId ?? (agent.kind === "linked" ? agent.agentId : undefined);
    if (!retellAgentId) {
      toast.error("This agent has not been synced with Retell.");
      return;
    }

    setTestingId(agent.id);
    const loadingId = toast.loading("Starting test call…");

    // Pre-insert a pending call row so we always have a record, even on failure.
    let localCallRowId: string | null = null;
    try {
      const { data: pending } = await supabase
        .from("calls" as never)
        .insert({
          agent_id: retellAgentId,
          agent_name: agent.internalName,
          direction: "inbound",
          call_type: "web_call",
          status: "initiating",
        } as never)
        .select("id")
        .single();
      localCallRowId = (pending as { id?: string } | null)?.id ?? null;
    } catch {
      // Non-fatal — proceed with the Retell call even if the local log failed.
    }

    try {
      const call = await retellService.createWebCall({
        agent_id: retellAgentId,
      });

      if (!call?.call_id) {
        throw new RetellApiError("Retell did not return a call_id.");
      }

      // Persist the returned call_id + status.
      if (localCallRowId) {
        await supabase
          .from("calls" as never)
          .update({
            retell_call_id: call.call_id,
            status: call.call_status ?? "registered",
            metadata: call as unknown as Record<string, unknown>,
          } as never)
          .eq("id", localCallRowId);
      } else {
        await supabase.from("calls" as never).insert({
          retell_call_id: call.call_id,
          agent_id: retellAgentId,
          agent_name: agent.internalName,
          direction: "inbound",
          call_type: "web_call",
          status: call.call_status ?? "registered",
          metadata: call as unknown as Record<string, unknown>,
        } as never);
      }

      // Request mic permission up front so startCall doesn't silently fail.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the probe stream; the SDK acquires its own.
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("Microphone permission is required for a test call.");
      }

      // Instantiate the Retell Web SDK and join the call.
      const client = new RetellWebClient();
      retellClientRef.current = client;

      client.on("call_started", () => {
        toast.success("Call connected.");
      });
      client.on("call_ended", () => {
        toast("Call ended.");
        if (localCallRowId) {
          supabase
            .from("calls" as never)
            .update({ status: "ended" } as never)
            .eq("id", localCallRowId);
        }
        stopActiveCall();
      });
      client.on("error", (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Call error.";
        toast.error(msg);
        try {
          client.stopCall();
        } catch {
          // ignore
        }
        stopActiveCall();
      });
      // `update` fires with transcript/state deltas when supported by the SDK.
      // Guard because older SDK versions may not emit it.
      try {
        client.on("update", () => {
          // No-op: hook available for future transcript UI.
        });
      } catch {
        // ignore if event unsupported
      }

      await client.startCall({ accessToken: call.access_token });

      activeAgentIdRef.current = agent.id;
      setActiveCallId(call.call_id);
      toast.success(`Test call started. Call ID: ${call.call_id}`, { id: loadingId });
    } catch (err) {
      const message =
        err instanceof RetellApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to start test call.";
      toast.error(message, { id: loadingId });
      if (localCallRowId) {
        await supabase
          .from("calls" as never)
          .update({ status: "failed", error_message: message } as never)
          .eq("id", localCallRowId);
      }
      activeAgentIdRef.current = null;
    } finally {
      setTestingId(null);
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
                Create new voice agents or link existing ones
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
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </div>

          {/* Content */}
          {agents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-50 to-purple-50 flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No Agents Yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Create a new voice agent to get started, or link one you already have.
              </p>
              <Button
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 h-auto rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
              <button
                onClick={openLink}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                Connect via Agent ID
              </button>
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
                        <p className="text-xs text-slate-500 truncate capitalize">
                          {agent.kind === "linked" ? "Linked agent" : `Created · ${agent.preset}`}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      {agent.kind === "linked" ? (
                        <>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Agent ID:</span> {agent.agentId}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Phone:</span> {agent.phoneNumber}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Voice:</span> {agent.voice}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Ambience:</span> {agent.ambience}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setViewing(agent)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => handleTest(agent)}
                        disabled={testingId !== null && testingId !== agent.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-600 hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingId === agent.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting...
                          </>
                        ) : activeCallId && activeAgentIdRef.current === agent.id ? (
                          <>
                            <PhoneCall className="h-3.5 w-3.5" /> End Test
                          </>
                        ) : (
                          <>
                            <PhoneCall className="h-3.5 w-3.5" /> Test
                          </>
                        )}
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
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Link New Agent</DialogTitle>
            <DialogDescription>
              Enter the Agent ID from your provider dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internalName">Internal Name</Label>
              <Input
                id="internalName"
                value={linkForm.internalName}
                onChange={(e) => setLinkForm({ ...linkForm, internalName: e.target.value })}
                placeholder="e.g., Sales Bot v1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                value={linkForm.agentId}
                onChange={(e) => setLinkForm({ ...linkForm, agentId: e.target.value })}
                placeholder="agent_..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (E.164 Format)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={linkForm.phoneNumber}
                onChange={(e) => setLinkForm({ ...linkForm, phoneNumber: e.target.value })}
                placeholder="+1234567890"
                required
              />
              <p className="text-xs text-slate-500">
                Enter the phone number connected to this agent (e.g., +1234567890)
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
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
            <DialogDescription>
              {viewing?.kind === "linked" ? "Linked agent" : "Created agent"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {viewing?.kind === "linked" ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent ID</p>
                  <p className="text-slate-900 mt-1">{viewing?.agentId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</p>
                  <p className="text-slate-900 mt-1">{viewing?.phoneNumber}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preset</p>
                  <p className="text-slate-900 mt-1 capitalize">{viewing?.preset}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voice</p>
                  <p className="text-slate-900 mt-1">{viewing?.voice}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ambience</p>
                  <p className="text-slate-900 mt-1">{viewing?.ambience}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Response Speed</p>
                  <p className="text-slate-900 mt-1">{viewing?.responseSpeed}/10</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prompt</p>
                  <p className="text-slate-900 mt-1 whitespace-pre-wrap">{viewing?.prompt}</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live test-call conversation window */}
      <Dialog
        open={!!activeCallId}
        onOpenChange={(o) => {
          if (!o) stopActiveCall();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Test call in progress</DialogTitle>
            <DialogDescription>
              Your browser is connected to the Retell agent. Speak into your microphone to test the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center mb-4 animate-pulse">
              <PhoneCall className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {agents.find((a) => a.id === activeAgentIdRef.current)?.internalName ?? "Agent"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Call ID: {activeCallId}</p>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                stopActiveCall();
                toast("Test call ended.");
              }}
              className="w-full"
            >
              <PhoneOff className="h-4 w-4 mr-2" /> End call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAgentsPage;
