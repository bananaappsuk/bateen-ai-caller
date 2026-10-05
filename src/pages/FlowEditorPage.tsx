import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, AlertTriangle, PhoneForwarded, PhoneOff, MessageSquare, Play,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getAgent } from "@/services/agentsService";
import {
  getFlow, updateFlow, validateFlow, EDITABLE_NODE_TYPES,
  type ConversationFlow, type FlowNode, type NodeType,
} from "@/services/conversationFlowService";

// Editing a flow as a list of steps rather than a drag-around canvas: what
// matters to whoever maintains this is the wording of each step and the plain
// English that decides where the caller goes next, and a canvas buries both.
// Node positions are preserved untouched so a flow stays laid out correctly if
// it is later opened in Retell's own editor.

const TYPE_LABEL: Record<string, string> = {
  conversation: "Talk to the caller",
  end: "End the call",
  transfer_call: "Transfer to a person",
  function: "Run a tool",
  branch: "Branch",
  extract_dynamic_variables: "Capture details",
};

const TYPE_ICON: Record<string, typeof MessageSquare> = {
  conversation: MessageSquare,
  end: PhoneOff,
  transfer_call: PhoneForwarded,
};

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "step";

const FlowEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState("");
  const [flow, setFlow] = useState<ConversationFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const agent = await getAgent(id!);
        if (!agent) throw new Error("That agent no longer exists.");
        setAgentName(agent.name ?? "Agent");
        const flowId = agent.retell_conversation_flow_id;
        if (!flowId) throw new Error("This agent does not use a conversation flow.");
        const f = await getFlow(flowId);
        setFlow(f);
        setSelectedId(f.start_node_id ?? f.nodes[0]?.id ?? null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not open this flow.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const problems = useMemo(() => (flow ? validateFlow(flow) : []), [flow]);
  const selected = flow?.nodes.find((n) => n.id === selectedId) ?? null;

  const patchNode = (nodeId: string, patch: Partial<FlowNode>) =>
    setFlow((f) =>
      f ? { ...f, nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)) } : f,
    );

  const addNode = (type: NodeType) => {
    setFlow((f) => {
      if (!f) return f;
      const base = type === "end" ? "goodbye" : type === "transfer_call" ? "transfer" : "new_step";
      let name = base;
      let i = 2;
      while (f.nodes.some((n) => n.id === name)) name = `${base}_${i++}`;
      const node: FlowNode = {
        id: name,
        type,
        display_position: { x: 160 * f.nodes.length, y: 120 },
        instruction: { type: "prompt", text: "" },
        edges: [],
        ...(type === "transfer_call" ? { transfer_destination: { type: "predefined", number: "" } } : {}),
      };
      setSelectedId(name);
      return { ...f, nodes: [...f.nodes, node] };
    });
  };

  const removeNode = (nodeId: string) => {
    if (flow?.start_node_id === nodeId) {
      toast.error("That is the first step. Make another step the start before deleting it.");
      return;
    }
    if (!window.confirm(`Delete step "${nodeId}"? Any routes into it will be removed too.`)) return;
    setFlow((f) =>
      f
        ? {
            ...f,
            nodes: f.nodes
              .filter((n) => n.id !== nodeId)
              .map((n) => ({ ...n, edges: (n.edges ?? []).filter((e) => e.destination_node_id !== nodeId) })),
          }
        : f,
    );
    setSelectedId(flow?.start_node_id ?? null);
  };

  const addEdge = (nodeId: string) =>
    setFlow((f) => {
      if (!f) return f;
      const other = f.nodes.find((n) => n.id !== nodeId);
      return {
        ...f,
        nodes: f.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                edges: [
                  ...(n.edges ?? []),
                  {
                    id: `e-${Date.now().toString(36)}`,
                    destination_node_id: other?.id ?? nodeId,
                    transition_condition: { type: "prompt" as const, prompt: "" },
                  },
                ],
              }
            : n,
        ),
      };
    });

  const patchEdge = (nodeId: string, edgeId: string, patch: Partial<{ destination_node_id: string; prompt: string }>) =>
    setFlow((f) =>
      f
        ? {
            ...f,
            nodes: f.nodes.map((n) =>
              n.id !== nodeId
                ? n
                : {
                    ...n,
                    edges: (n.edges ?? []).map((e) =>
                      e.id !== edgeId
                        ? e
                        : {
                            ...e,
                            destination_node_id: patch.destination_node_id ?? e.destination_node_id,
                            transition_condition:
                              patch.prompt !== undefined
                                ? { type: "prompt" as const, prompt: patch.prompt }
                                : e.transition_condition,
                          },
                    ),
                  },
            ),
          }
        : f,
    );

  const removeEdge = (nodeId: string, edgeId: string) =>
    setFlow((f) =>
      f
        ? {
            ...f,
            nodes: f.nodes.map((n) =>
              n.id === nodeId ? { ...n, edges: (n.edges ?? []).filter((e) => e.id !== edgeId) } : n,
            ),
          }
        : f,
    );

  const handleSave = async () => {
    if (!flow) return;
    const found = validateFlow(flow);
    // Only a broken route stops a save; an unused step is worth saying, not blocking.
    const blocking = found.filter((p) => !/Nothing leads to/.test(p.message));
    if (blocking.length) {
      toast.error(blocking[0].message);
      return;
    }
    setSaving(true);
    try {
      await updateFlow(flow.conversation_flow_id, {
        global_prompt: flow.global_prompt,
        start_node_id: flow.start_node_id,
        start_speaker: flow.start_speaker,
        nodes: flow.nodes,
      });
      toast.success("Flow saved. New calls will use it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the flow.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="w-full px-6 py-8 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading flow…
        </div>
      </DashboardLayout>
    );
  }

  if (!flow) {
    return (
      <DashboardLayout>
        <div className="w-full px-6 py-8">
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-16 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Flow unavailable</h2>
              <p className="text-sm text-slate-500 mt-1">
                This agent does not have a conversation flow we can edit.
              </p>
              <Button onClick={() => navigate(-1)} className="mt-6 rounded-xl">
                Go back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => navigate("/ai-agents")}
              aria-label="Back to agents"
              className="mt-1 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{agentName}</h1>
              <p className="text-sm text-slate-500">
                What this agent does at each point in the call, and what makes it move on.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl shrink-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save flow</>}
          </Button>
        </div>

        {problems.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {problems.length} thing{problems.length === 1 ? "" : "s"} to fix
            </p>
            <ul className="mt-2 space-y-1">
              {problems.map((p, i) => (
                <li key={i} className="text-sm text-amber-700">• {p.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6">
          <Label htmlFor="globalPrompt">How the agent should behave throughout</Label>
          <Textarea
            id="globalPrompt"
            value={flow.global_prompt ?? ""}
            onChange={(e) => setFlow({ ...flow, global_prompt: e.target.value })}
            rows={4}
            className="mt-1.5 rounded-xl"
            placeholder="Who it is answering for, its tone, and anything it must never do."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* the steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900">Steps</h2>
              <Select onValueChange={(v) => addNode(v as NodeType)} value="">
                <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs" aria-label="Add a step">
                  <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add</span>
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_NODE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              {flow.nodes.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? MessageSquare;
                const isStart = flow.start_node_id === n.id;
                const editable = EDITABLE_NODE_TYPES.includes(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      selectedId === n.id
                        ? "border-cyan-300 bg-cyan-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-900 truncate">{n.id}</span>
                      {isStart && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700">
                          <Play className="h-2.5 w-2.5" /> START
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {TYPE_LABEL[n.type] ?? n.type}
                      {!editable && " · read-only"}
                      {(n.edges ?? []).length > 0 && ` · ${n.edges!.length} route${n.edges!.length === 1 ? "" : "s"}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* the selected step */}
          <div>
            {!selected ? (
              <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-12 text-center text-sm text-slate-500">
                  Choose a step on the left to edit it.
                </CardContent>
              </Card>
            ) : !EDITABLE_NODE_TYPES.includes(selected.type) ? (
              <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-8">
                  <h3 className="text-base font-semibold text-slate-900">{selected.id}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    This is a <strong>{TYPE_LABEL[selected.type] ?? selected.type}</strong> step, built in
                    Retell. It is kept exactly as it is and saved untouched — editing it here could break it.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Label htmlFor="nodeName">Step name</Label>
                      <Input
                        id="nodeName"
                        value={selected.id}
                        onChange={(e) => {
                          const next = slug(e.target.value);
                          if (!next || flow.nodes.some((n) => n.id === next && n.id !== selected.id)) return;
                          const from = selected.id;
                          setFlow((f) =>
                            f
                              ? {
                                  ...f,
                                  start_node_id: f.start_node_id === from ? next : f.start_node_id,
                                  nodes: f.nodes.map((n) => ({
                                    ...(n.id === from ? { ...n, id: next } : n),
                                    edges: (n.edges ?? []).map((e) =>
                                      e.destination_node_id === from ? { ...e, destination_node_id: next } : e,
                                    ),
                                  })),
                                }
                              : f,
                          );
                          setSelectedId(next);
                        }}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-1 pt-7">
                      {flow.start_node_id !== selected.id && (
                        <Button
                          variant="outline"
                          onClick={() => setFlow({ ...flow, start_node_id: selected.id })}
                          className="rounded-xl text-xs h-9"
                        >
                          Make this the start
                        </Button>
                      )}
                      <button
                        onClick={() => removeNode(selected.id)}
                        aria-label={`Delete step ${selected.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nodeText">
                      {selected.type === "end" ? "What it says before hanging up" : "What it should do here"}
                    </Label>
                    <Textarea
                      id="nodeText"
                      rows={4}
                      value={selected.instruction?.text ?? ""}
                      onChange={(e) =>
                        patchNode(selected.id, {
                          instruction: { type: selected.instruction?.type ?? "prompt", text: e.target.value },
                        })
                      }
                      className="rounded-xl"
                      placeholder="Describe what the agent should say or find out at this point."
                    />
                  </div>

                  {selected.type === "transfer_call" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="transferTo">Transfer to</Label>
                      <Input
                        id="transferTo"
                        value={selected.transfer_destination?.number ?? ""}
                        onChange={(e) =>
                          patchNode(selected.id, {
                            transfer_destination: { type: "predefined", number: e.target.value },
                          })
                        }
                        placeholder="+447700900123"
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  {selected.type !== "end" && selected.type !== "transfer_call" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Where the caller goes next</Label>
                        <Button
                          variant="outline"
                          onClick={() => addEdge(selected.id)}
                          className="rounded-xl text-xs h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add a route
                        </Button>
                      </div>
                      {(selected.edges ?? []).length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No routes yet — the caller would have nowhere to go from here.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(selected.edges ?? []).map((e) => (
                            <div key={e.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 shrink-0">Go to</span>
                                <Select
                                  value={e.destination_node_id}
                                  onValueChange={(v) => patchEdge(selected.id, e.id, { destination_node_id: v })}
                                >
                                  <SelectTrigger
                                    className="h-8 rounded-lg text-sm"
                                    aria-label={`Destination for route ${e.id}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {flow.nodes
                                      .filter((n) => n.id !== selected.id)
                                      .map((n) => (
                                        <SelectItem key={n.id} value={n.id}>{n.id}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  onClick={() => removeEdge(selected.id, e.id)}
                                  aria-label={`Remove route ${e.id}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Textarea
                                rows={2}
                                value={e.transition_condition?.prompt ?? ""}
                                onChange={(ev) => patchEdge(selected.id, e.id, { prompt: ev.target.value })}
                                aria-label={`Condition for route ${e.id}`}
                                placeholder="When should the caller go there? e.g. They ask about fees."
                                className="rounded-xl text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FlowEditorPage;
