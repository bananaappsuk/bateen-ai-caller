import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { retellService, RetellApiError, type RetellVoice } from "@/services/retellService";
import { listAgentVoices } from "@/services/voicesService";
import VoiceRecorder from "@/components/VoiceRecorder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getAgent as getLocalAgent, updateAgent as updateLocalAgent, type AgentRow } from "@/services/agentsService";
import {
  buildAgentTools,
  buildDeliveryGuidance,
  buildToolGuidance,
  parseAgentTools,
  stripAppendedGuidance,
} from "@/lib/agentTools";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PhoneOff,
  PhoneForwarded,
  Voicemail,
  Gauge,
  Waves,
  Loader2,
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

const AMBIENCES = [
  { id: "none", label: "None (silent)" },
  { id: "cafe", label: "Coffee shop" },
  { id: "callcenter", label: "Call center" },
];

const AMBIENT_MAP: Record<string, string> = {
  cafe: "coffee-shop",
  callcenter: "call-center",
};
const AMBIENT_REVERSE_MAP: Record<string, string> = {
  "coffee-shop": "cafe",
  "call-center": "callcenter",
};

const EditAgentPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = getDevUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voices, setVoices] = useState<RetellVoice[]>([]);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [localAgent, setLocalAgent] = useState<AgentRow | null>(null);
  const [llmId, setLlmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    internalName: "",
    voiceId: "",
    prompt: "",
    ambience: "none",
    responseSpeed: 5,
    hangUpOnVoicemail: true,
    endCallAutomatically: true,
    transferToHuman: false,
    transferNumber: "",
  });

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [local, voiceList] = await Promise.all([
          getLocalAgent(id),
          listAgentVoices().catch(() => []),
        ]);
        if (!local) {
          toast.error("Agent not found.");
          navigate("/ai-agents");
          return;
        }
        setLocalAgent(local);
        setVoices(voiceList);

        if (!local.retell_agent_id) {
          toast.error("This agent isn't synced with Retell — nothing to edit.");
          navigate("/ai-agents");
          return;
        }

        const remoteAgent = await retellService.getAgent(local.retell_agent_id);
        const engine = remoteAgent.response_engine as { llm_id?: string } | undefined;
        const remoteLlmId = engine?.llm_id;
        setLlmId(remoteLlmId ?? null);

        const remoteLlm = remoteLlmId ? await retellService.getLlm(remoteLlmId) : null;
        const toolState = parseAgentTools(remoteLlm?.general_tools as unknown[] | undefined);
        const ambientSound = (remoteAgent.ambient_sound as string | undefined) ?? "";
        const voicemail = remoteAgent.voicemail_option as { action?: { type?: string } } | undefined;

        setForm({
          internalName: (remoteAgent.agent_name as string | undefined) ?? local.name,
          voiceId: (remoteAgent.voice_id as string | undefined) ?? local.retell_voice_id ?? "",
          prompt: stripAppendedGuidance(remoteLlm?.general_prompt ?? local.prompt ?? ""),
          ambience: AMBIENT_REVERSE_MAP[ambientSound] ?? "none",
          responseSpeed: Math.round(((remoteAgent.responsiveness as number | undefined) ?? 0.5) * 10) || 5,
          hangUpOnVoicemail: voicemail?.action?.type === "hangup",
          endCallAutomatically: toolState.endCallEnabled,
          transferToHuman: toolState.transferEnabled,
          transferNumber: toolState.transferNumber,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load agent.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localAgent || !localAgent.retell_agent_id || !llmId) return;
    if (!form.internalName.trim() || !form.prompt.trim() || !form.voiceId || submitting) return;

    setSubmitting(true);
    const loadingId = toast.loading("Saving changes…");
    const name = form.internalName.trim();
    const prompt = form.prompt.trim();

    // Transfer to a Human's toggle is frozen in the UI (feature disabled for
    // now), so this just carries forward whatever the agent already had —
    // existing agents keep working exactly as before.
    const toolConfig = {
      endCall: { enabled: form.endCallAutomatically },
      transfer: { enabled: form.transferToHuman, phoneNumber: form.transferNumber.trim() },
    };
    const tools = buildAgentTools(toolConfig);

    try {
      await retellService.updateLlm(llmId, {
        general_prompt: prompt + buildDeliveryGuidance() + buildToolGuidance(toolConfig),
        general_tools: tools,
      });

      const ambientSound = AMBIENT_MAP[form.ambience];
      await retellService.updateAgent(localAgent.retell_agent_id, {
        agent_name: name,
        voice_id: form.voiceId,
        responsiveness: form.responseSpeed / 10,
        ambient_sound: ambientSound ?? null,
        ...(ambientSound ? { ambient_sound_volume: 0.3 } : {}),
        voicemail_option: form.hangUpOnVoicemail ? { action: { type: "hangup" } } : null,
      });

      await updateLocalAgent(localAgent.id, {
        name,
        retell_voice_id: form.voiceId,
        prompt,
        metadata: {
          ambience: form.ambience,
          responseSpeed: form.responseSpeed,
          endCallAutomatically: form.endCallAutomatically,
          transferToHuman: form.transferToHuman,
        },
      });

      toast.success("Agent updated.", { id: loadingId });
      navigate("/ai-agents");
    } catch (err) {
      const msg =
        err instanceof RetellApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update agent.";
      toast.error(msg, { id: loadingId });
      setSubmitting(false);
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
          <div className="w-full flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Back to Voice Agents"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Edit Agent</h1>
              <p className="text-sm text-slate-500">
                Update this agent's script, voice, and behaviour.
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
            <form id="edit-agent-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="w-full px-6 sm:px-10 py-8 space-y-6">
                {/* Voice */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice">Voice</Label>
                    <button
                      type="button"
                      onClick={() => setVoiceDialogOpen(true)}
                      className="text-sm font-medium text-[#00D4FF] hover:underline"
                    >
                      + Use your own voice
                    </button>
                  </div>
                  <Select value={form.voiceId} onValueChange={(v) => setForm({ ...form, voiceId: v })}>
                    <SelectTrigger id="voice">
                      <SelectValue placeholder="Choose a voice" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {voices.some((v) => v.voice_type === "custom") && (
                        <SelectGroup>
                          <SelectLabel>My voices</SelectLabel>
                          {voices
                            .filter((v) => v.voice_type === "custom")
                            .map((v) => (
                              <SelectItem key={v.voice_id} value={v.voice_id}>
                                {v.voice_name ?? v.voice_id}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        {voices.some((v) => v.voice_type === "custom") && (
                          <SelectLabel>Standard voices</SelectLabel>
                        )}
                        {voices
                          .filter((v) => v.voice_type !== "custom")
                          .map((v) => (
                            <SelectItem key={v.voice_id} value={v.voice_id}>
                              {v.voice_name ?? v.voice_id}
                              {v.gender ? ` · ${v.gender}` : ""}
                              {v.accent ? ` · ${v.accent}` : ""}
                              {v.provider ? ` (${v.provider})` : ""}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Agent Name */}
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    value={form.internalName}
                    onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                    placeholder="e.g., Sales Outreach Bot"
                    required
                  />
                </div>

                {/* Script / Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Script / Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder="You are a friendly sales representative for..."
                    rows={10}
                    required
                  />
                  <p className="text-xs text-slate-500">Describe the agent's role, tone, and objectives.</p>
                </div>

                {/* Background Ambience */}
                <div className="space-y-2">
                  <Label htmlFor="ambience" className="flex items-center gap-1.5">
                    <Waves className="h-3.5 w-3.5" /> Background Ambience
                  </Label>
                  <Select value={form.ambience} onValueChange={(v) => setForm({ ...form, ambience: v })}>
                    <SelectTrigger id="ambience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AMBIENCES.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Response Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5" /> Response Speed
                    </Label>
                    <span className="text-xs font-medium text-slate-700">{form.responseSpeed}/10</span>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[form.responseSpeed]}
                    onValueChange={(v) => setForm({ ...form, responseSpeed: v[0] })}
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Thoughtful</span>
                    <span>Snappy</span>
                  </div>
                </div>

                {/* Hang up on voicemail */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <Voicemail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Hang Up on Voicemail</p>
                      <p className="text-xs text-slate-500">Automatically end the call if voicemail is detected.</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.hangUpOnVoicemail}
                    onCheckedChange={(c) => setForm({ ...form, hangUpOnVoicemail: c })}
                  />
                </div>

                {/* Tools */}
                <div className="space-y-2">
                  <Label>Tools</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center gap-3">
                        <PhoneOff className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">End Call Automatically</p>
                          <p className="text-xs text-slate-500">Let the agent hang up when the conversation is complete.</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.endCallAutomatically}
                        onCheckedChange={(c) => setForm({ ...form, endCallAutomatically: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white opacity-75">
                      <div className="flex items-center gap-3">
                        <PhoneForwarded className="h-4 w-4 text-slate-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">Transfer to a Human</p>
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Coming Soon
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Warm-transfer the call to a human agent when needed.</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            This feature will be available in a future update.
                          </p>
                        </div>
                      </div>
                      <Switch checked={form.transferToHuman} disabled />
                    </div>
                    {form.transferToHuman && (
                      <Input value={form.transferNumber} readOnly disabled />
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="shrink-0 bg-white border-t border-slate-100 px-6 sm:px-10 py-4">
              <div className="w-full flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-agent-form"
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
                >
                  {submitting ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Use your own voice</DialogTitle>
            <DialogDescription>
              Record a sample and we'll create a voice your agents can speak with.
            </DialogDescription>
          </DialogHeader>
          <VoiceRecorder
            onCloned={(voice) => {
              setVoices((prev) => [
                { voice_id: voice.voice_id, voice_name: voice.voice_name, voice_type: "custom", provider: voice.provider },
                ...prev,
              ]);
              setForm((f) => ({ ...f, voiceId: voice.voice_id }));
              setVoiceDialogOpen(false);
              toast.success(`Voice "${voice.voice_name}" is ready to use.`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditAgentPage;
