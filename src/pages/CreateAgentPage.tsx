import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {  useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { retellService, RetellApiError, type RetellVoice } from "@/services/retellService";
import { createAgent, listAgents } from "@/services/agentsService";
import { getBillingAccount } from "@/services/creditsService";
import { buildAgentTools, buildDeliveryGuidance, buildToolGuidance, LIVE_TOOLS } from "@/lib/agentTools";
import { PLAYBOOKS, DEFAULT_PLAYBOOK, composePrompt } from "@/lib/voicePlaybooks";
import { listAgentVoices } from "@/services/voicesService";
import { listKnowledgeBases, setAgentKnowledgeBases, type KnowledgeBase } from "@/services/knowledgeBaseService";
import { useCallMode } from "@/lib/callMode";
import VoiceRecorder from "@/components/VoiceRecorder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { limitsFor } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { getDevUser } from "@/lib/devAuth";
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
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  ArrowLeft,
  PhoneOff,
  PhoneForwarded,
  Voicemail,
  Gauge,
  Waves,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";


const PRESETS = [
  { id: "sales", label: "Sales Outreach", desc: "Qualify leads and book meetings" },
  { id: "support", label: "Customer Support", desc: "Answer questions and resolve issues" },
  { id: "survey", label: "Survey / Feedback", desc: "Collect responses from customers" },
  { id: "reminder", label: "Appointment Reminder", desc: "Confirm and reschedule bookings" },
];

const AMBIENCES = [
  { id: "none", label: "None (silent)" },
  { id: "cafe", label: "Coffee shop" },
  { id: "callcenter", label: "Call center" },
];

// UI ambience -> Retell ambient_sound value.
const AMBIENT_MAP: Record<string, string> = {
  cafe: "coffee-shop",
  callcenter: "call-center",
};

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/retell-webhook`;
const LLM_MODEL = "gpt-4.1-mini";

const defaultForm = {
  preset: "sales",
  voiceId: "",
  internalName: "",
  prompt: "",
  ambience: "none",
  responseSpeed: 5,
  hangUpOnVoicemail: true,
  endCallAutomatically: true,
};

const CreateAgentPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [form, setForm] = useState(defaultForm);
  const [voices, setVoices] = useState<RetellVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const { mode, isInbound } = useCallMode();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [playbook, setPlaybook] = useState<string>(DEFAULT_PLAYBOOK);
  // Recognising a returning caller costs nothing and makes the first ten
  // seconds of every repeat call better, so it is on unless turned off.
  const [liveTools, setLiveTools] = useState<string[]>(["look_up_caller", "take_message"]);
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  // Retell marks cloned voices as voice_type "custom"; the edge function has
  // already stripped other tenants' clones, so anything custom here is ours.
  const myVoices = voices.filter((v) => v.voice_type === "custom");
  const stockVoices = voices.filter((v) => v.voice_type !== "custom");
  const [submitting, setSubmitting] = useState(false);
  const [maxAgents, setMaxAgents] = useState(Number.MAX_SAFE_INTEGER);
  const [agentCount, setAgentCount] = useState(0);
  const [builder, setBuilder] = useState({ businessName: "", businessDescription: "", targetAudience: "", goal: "" });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ script?: string; error?: string }>(
        "generate-script",
        { body: builder },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.script) {
        setForm((f) => ({ ...f, prompt: data.script as string }));
        toast.success("Script generated — edit it as you like.");
      } else {
        toast.error("No script returned.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate script.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listAgentVoices();
        listKnowledgeBases().then(setKnowledgeBases).catch(() => setKnowledgeBases([]));
        if (cancelled) return;
        setVoices(list);
        if (list.length > 0) setForm((f) => ({ ...f, voiceId: list[0].voice_id }));
      } catch {
        if (!cancelled) setVoices([]);
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [acct, agents] = await Promise.all([getBillingAccount(), listAgents()]);
        setMaxAgents(limitsFor(acct?.plan_tier).maxAgents);
        setAgentCount(agents.length);
      } catch {
        /* noop */
      }
    })();
  }, []);

  if (!user) return null;

  const handleCancel = () => navigate("/ai-agents");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.internalName.trim() || !form.prompt.trim() || !form.voiceId || submitting) return;

    if (agentCount >= maxAgents) {
      toast.error(`Your plan allows up to ${maxAgents} agent${maxAgents === 1 ? "" : "s"}. Upgrade to add more.`);
      return;
    }

    setSubmitting(true);
    const loadingId = toast.loading("Creating agent on Retell…");
    const name = form.internalName.trim();
    const prompt = form.prompt.trim();

    // Transfer to a Human is disabled for now (may consume additional call
    // credits) — always submitted as off regardless of any UI state.
    const toolConfig = {
      endCall: { enabled: form.endCallAutomatically },
      transfer: { enabled: false, phoneNumber: "" },
      live: liveTools,
    };
    // Built twice: the agent id only exists after step 2, and the tool URL
    // needs it so our endpoint can tell whose tenant is calling.
    const tools = buildAgentTools(toolConfig);

    try {
      // 1. Retell LLM (with tools + tool guidance appended to the script).
      // The script tells the agent how to talk; the knowledge bases give it
      // facts to look up mid-call. Both live on the same Retell LLM.
      const kbIds = knowledgeBases
        .filter((k) => selectedKbs.includes(k.id))
        .map((k) => k.retell_kb_id);
      const llm = await retellService.createLlm({
        model: LLM_MODEL,
        general_prompt: composePrompt(prompt, playbook) + buildDeliveryGuidance() + buildToolGuidance(toolConfig),
        ...(tools.length ? { general_tools: tools } : {}),
        ...(kbIds.length ? { knowledge_base_ids: kbIds } : {}),
      });

      // 2. Retell agent (with our webhook + VocalMax-style behavior options).
      const ambientSound = AMBIENT_MAP[form.ambience];
      const agentInput: Record<string, unknown> = {
        agent_name: name,
        voice_id: form.voiceId,
        response_engine: { type: "retell-llm", llm_id: llm.llm_id },
        webhook_url: WEBHOOK_URL,
        responsiveness: form.responseSpeed / 10,
      };
      if (ambientSound) {
        agentInput.ambient_sound = ambientSound;
        agentInput.ambient_sound_volume = 0.3;
      }
      if (form.hangUpOnVoicemail) {
        agentInput.voicemail_option = { action: { type: "hangup" } };
      }
      const agent = await retellService.createAgent(agentInput as never);

      // 2b. Now that the agent has an id, point its live tools at us with that
      // id attached. Without this the tool fires but we cannot resolve the
      // tenant until the call_started webhook has landed, which is a race.
      if (liveTools.length) {
        await retellService.updateLlm(llm.llm_id, {
          general_tools: buildAgentTools({ ...toolConfig, retellAgentId: agent.agent_id }),
        } as never);
      }

      // 3. Persist to DB.
      const savedAgent = await createAgent({
        direction: mode,
        retell_agent_id: agent.agent_id,
        retell_agent_version: typeof agent.version === "number" ? agent.version : 0,
        retell_llm_id: llm.llm_id,
        name,
        retell_voice_id: form.voiceId,
        prompt,
        language: "en-US",
        llm: LLM_MODEL,
        status: "active",
        metadata: {
          preset: form.preset,
          ambience: form.ambience,
          responseSpeed: form.responseSpeed,
          endCallAutomatically: form.endCallAutomatically,
          transferToHuman: false,
          playbook,
          liveTools,
        },
      });
      if (selectedKbs.length) {
        await setAgentKnowledgeBases(savedAgent.id, selectedKbs);
      }

      toast.success("Agent created and synced with Retell.", { id: loadingId });
      navigate("/ai-agents");
    } catch (err) {
      const msg =
        err instanceof RetellApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create agent.";
      toast.error(msg, { id: loadingId });
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeHref="/ai-agents" mainClassName="flex-1 ml-[260px] h-screen flex flex-col">
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
              <h1 className="text-xl font-bold text-slate-900">Create New Agent</h1>
              <p className="text-sm text-slate-500">
                Configure your AI voice agent's personality, voice, and behaviour.
              </p>
            </div>
          </div>
        </div>

        <form id="create-agent-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="w-full px-6 sm:px-10 py-8 space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, preset: p.id })}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      form.preset === p.id
                        ? "border-cyan-400 bg-cyan-50/50 ring-2 ring-cyan-100"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice (live from Retell) */}
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
              {loadingVoices ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading voices from Retell…
                </div>
              ) : (
                <Select value={form.voiceId} onValueChange={(v) => setForm({ ...form, voiceId: v })}>
                  <SelectTrigger id="voice">
                    <SelectValue placeholder="Choose a voice" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {myVoices.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>My voices</SelectLabel>
                        {myVoices.map((v) => (
                          <SelectItem key={v.voice_id} value={v.voice_id}>
                            {v.voice_name ?? v.voice_id}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      {myVoices.length > 0 && <SelectLabel>Standard voices</SelectLabel>}
                      {stockVoices.map((v) => (
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
              )}
            </div>

            {/* Playbook — the telephone manner, so the script can be about the business */}
            <div className="space-y-2">
              <Label htmlFor="playbook">How it should handle the call</Label>
              <Select value={playbook} onValueChange={setPlaybook}>
                <SelectTrigger id="playbook" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBOOKS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                {PLAYBOOKS.find((p) => p.id === playbook)?.summary}{" "}
                Speaking rules — one question at a time, no jargon read aloud, admit when unsure — are
                always added, so your script only needs to cover your business.
              </p>
            </div>

            {/* Live tools — what it can DO, not just say */}
            <div className="space-y-2">
              <Label>What it can do during the call</Label>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                {LIVE_TOOLS.map((tool) => (
                  <label key={tool.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveTools.includes(tool.id)}
                      onChange={(e) =>
                        setLiveTools((prev) =>
                          e.target.checked ? [...prev, tool.id] : prev.filter((x) => x !== tool.id),
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#00D4FF]"
                    />
                    <span className="flex-1">
                      <span className="block text-sm text-slate-700">{tool.label}</span>
                      <span className="block text-xs text-slate-400">{tool.summary}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Anything the agent takes down appears under Enquiries.
              </p>
            </div>

            {/* Knowledge bases — facts the agent can look up while talking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Knowledge base</Label>
                <a href="/dashboard/knowledge-base" className="text-sm font-medium text-[#00D4FF] hover:underline">
                  Manage
                </a>
              </div>
              {knowledgeBases.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No knowledge bases yet. The agent will rely on its script alone.{" "}
                  <a href="/dashboard/knowledge-base" className="text-[#00D4FF] hover:underline">
                    Create one
                  </a>
                  .
                </p>
              ) : (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  {knowledgeBases.map((kb) => (
                    <label key={kb.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedKbs.includes(kb.id)}
                        onChange={(e) =>
                          setSelectedKbs((prev) =>
                            e.target.checked ? [...prev, kb.id] : prev.filter((x) => x !== kb.id),
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-[#00D4FF]"
                      />
                      <span className="flex-1 text-sm text-slate-700">{kb.name}</span>
                      <span className="text-xs text-slate-400">
                        {kb.source_count} source{kb.source_count === 1 ? "" : "s"}
                        {kb.status !== "complete" ? " · indexing" : ""}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                The agent looks these up before answering, so it quotes real details instead of guessing.
              </p>
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

            {/* AI script builder */}
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                <p className="text-sm font-semibold text-slate-900">Generate a script with AI</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Business name"
                  value={builder.businessName}
                  onChange={(e) => setBuilder({ ...builder, businessName: e.target.value })}
                />
                <Input
                  placeholder="Target audience"
                  value={builder.targetAudience}
                  onChange={(e) => setBuilder({ ...builder, targetAudience: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="What does the business do?"
                rows={2}
                value={builder.businessDescription}
                onChange={(e) => setBuilder({ ...builder, businessDescription: e.target.value })}
              />
              <Input
                placeholder="Goal of the call (e.g. book a demo)"
                value={builder.goal}
                onChange={(e) => setBuilder({ ...builder, goal: e.target.value })}
              />
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {generating ? "Generating…" : "✨ Generate script"}
              </Button>
            </div>

            {/* Script / Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Script / Prompt</Label>
              <Textarea
                id="prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder="You are a friendly sales representative for..."
                rows={6}
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
                  <Switch checked={false} disabled />
                </div>
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
              form="create-agent-form"
              disabled={submitting || loadingVoices}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-95"
            >
              {submitting ? "Creating…" : "Create Agent"}
            </Button>
          </div>
        </div>
      

      {/* Clone your own voice */}
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
              // Show it immediately and select it, rather than making the user
              // reopen the picker to find it.
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
    </DashboardLayout>
  );
};

export default CreateAgentPage;
