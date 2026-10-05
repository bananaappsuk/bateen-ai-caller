import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {  useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { retellService, RetellApiError, type RetellVoice } from "@/services/retellService";
import { listAgentVoices } from "@/services/voicesService";
import {
  listKnowledgeBases,
  getAgentKnowledgeBaseIds,
  setAgentKnowledgeBases,
  type KnowledgeBase,
} from "@/services/knowledgeBaseService";
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
  LIVE_TOOLS,
} from "@/lib/agentTools";
import { PLAYBOOKS, composePrompt, decomposePrompt, detectPlaybook } from "@/lib/voicePlaybooks";
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
  SelectLabel,
  SelectItem,
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
} from "lucide-react";
import { cn } from "@/lib/utils";


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
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  const [localAgent, setLocalAgent] = useState<AgentRow | null>(null);
  const [llmId, setLlmId] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<string>("none");
  const [liveTools, setLiveTools] = useState<string[]>([]);

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

        // All of this account's knowledge bases are offered regardless of
        // direction — the same one can serve an outbound and an inbound agent.
        const [allKbs, attachedRetellIds] = await Promise.all([
          listKnowledgeBases().catch(() => [] as KnowledgeBase[]),
          getAgentKnowledgeBaseIds(local.id).catch(() => [] as string[]),
        ]);
        setKnowledgeBases(allKbs);
        setSelectedKbs(allKbs.filter((k) => attachedRetellIds.includes(k.retell_kb_id)).map((k) => k.id));

        const remoteAgent = await retellService.getAgent(local.retell_agent_id);
        const engine = remoteAgent.response_engine as { llm_id?: string } | undefined;
        const remoteLlmId = engine?.llm_id;
        setLlmId(remoteLlmId ?? null);

        const remoteLlm = remoteLlmId ? await retellService.getLlm(remoteLlmId) : null;
        const toolState = parseAgentTools(remoteLlm?.general_tools as unknown[] | undefined);
        // The stored prompt is the user's words plus the generated parts; show
        // only their words back, and remember what it was generated from.
        const storedPrompt = remoteLlm?.general_prompt ?? local.prompt ?? "";
        setPlaybook(detectPlaybook(storedPrompt));
        setLiveTools(toolState.live);
        const ambientSound = (remoteAgent.ambient_sound as string | undefined) ?? "";
        const voicemail = remoteAgent.voicemail_option as { action?: { type?: string } } | undefined;

        setForm({
          internalName: (remoteAgent.agent_name as string | undefined) ?? local.name,
          voiceId: (remoteAgent.voice_id as string | undefined) ?? local.retell_voice_id ?? "",
          prompt: decomposePrompt(stripAppendedGuidance(storedPrompt)),
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
      live: liveTools,
      retellAgentId: localAgent.retell_agent_id,
    };
    const tools = buildAgentTools(toolConfig);

    try {
      const kbIds = knowledgeBases
        .filter((k) => selectedKbs.includes(k.id))
        .map((k) => k.retell_kb_id);
      await retellService.updateLlm(llmId, {
        general_prompt: composePrompt(prompt, playbook) + buildDeliveryGuidance() + buildToolGuidance(toolConfig),
        general_tools: tools,
        // Always sent, so clearing every box actually detaches them upstream
        // rather than silently leaving the old ones attached.
        knowledge_base_ids: kbIds,
      });
      await setAgentKnowledgeBases(localAgent.id, selectedKbs);

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

                {/* Playbook and live tools — same two controls as creation */}
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
                    {PLAYBOOKS.find((p) => p.id === playbook)?.summary}
                  </p>
                </div>

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
                </div>

                {/* Knowledge bases — shared across inbound and outbound agents */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Knowledge base</Label>
                    <a href="/dashboard/knowledge-base" className="text-sm font-medium text-[#00D4FF] hover:underline">
                      Manage
                    </a>
                  </div>
                  {knowledgeBases.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No knowledge bases yet. This agent will rely on its script alone.{" "}
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
    </DashboardLayout>
  );
};

export default EditAgentPage;
