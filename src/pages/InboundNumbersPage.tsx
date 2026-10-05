import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hash, Plus, Trash2, Loader2, PhoneIncoming, RefreshCw, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listInboundNumbers,
  addInboundNumber,
  assignAgentToNumber,
  removeInboundNumber,
  listPlatformNumbers,
  syncPhoneNumbers,
  type InboundNumber,
  type PlatformNumber,
} from "@/services/inboundService";
import { listAgents, type AgentRow } from "@/services/agentsService";
import { normalizeUkPhone } from "@/lib/phone";

const UNASSIGNED = "__none__";

const InboundNumbersPage = () => {
  const [numbers, setNumbers] = useState<InboundNumber[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState<PlatformNumber[]>([]);
  const [syncing, setSyncing] = useState(false);

  // What the picker offers: our numbers, minus the ones already set up.
  const taken = new Set(numbers.map((n) => n.phone_number));
  const selectable = platform.filter((p) => !taken.has(p.phone_number));

  const load = async () => {
    try {
      const [nums, all, owned] = await Promise.all([
        listInboundNumbers(),
        listAgents(),
        listPlatformNumbers(),
      ]);
      setNumbers(nums);
      // Only inbound agents can answer a number.
      setAgents(all.filter((a) => a.direction === "inbound"));
      setPlatform(owned);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load numbers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncPhoneNumbers();
      setPlatform(await listPlatformNumbers());
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh your numbers.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async () => {
    // The number comes from the picker, so it is already in E.164 and known to
    // be one of ours — nothing to normalise and nothing to reject.
    const normalized = normalizeUkPhone(phone);
    if (!normalized) {
      toast.error("Choose a number first.");
      return;
    }
    setSaving(true);
    try {
      await addInboundNumber(normalized, label.trim());
      toast.success(`${normalized} added.`);
      setOpen(false);
      setPhone("");
      setLabel("");
      load();
    } catch (err) {
      // 23505 is the unique index on phone_number; this page can word it better
      // than the generic "That already exists.".
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : "Could not add the number.";
      toast.error(code === "23505" ? "That number is already set up." : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (numberId: string, value: string) => {
    const agentId = value === UNASSIGNED ? null : value;
    try {
      await assignAgentToNumber(numberId, agentId);
      setNumbers((prev) =>
        prev.map((n) =>
          n.id === numberId
            ? { ...n, agent_id: agentId, agent: agents.find((a) => a.id === agentId) ?? null }
            : n,
        ),
      );
      toast.success(agentId ? "Agent assigned." : "Agent removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign the agent.");
    }
  };

  const handleRemove = async (n: InboundNumber) => {
    if (!window.confirm(`Remove ${n.phone_number}? Calls to it will stop being answered.`)) return;
    try {
      await removeInboundNumber(n.id);
      setNumbers((prev) => prev.filter((x) => x.id !== n.id));
      toast.success("Number removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the number.");
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Inbound Numbers"
          subtitle="The numbers people ring, and which agent picks up."
          actions={
            <Button
              onClick={() => setOpen(true)}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Number
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading numbers…
          </div>
        ) : numbers.length === 0 ? (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Hash className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No inbound numbers</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Add the number you want answered, then choose which agent should pick it up.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <div className="divide-y divide-slate-100">
                {numbers.map((n) => (
                  <div key={n.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                        <PhoneIncoming className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{n.phone_number}</p>
                        <p className="text-xs text-slate-500 truncate">{n.label || "No label"}</p>
                      </div>
                    </div>

                    <div className="w-full sm:w-[260px]">
                      <Select
                        value={n.agent_id ?? UNASSIGNED}
                        onValueChange={(v) => handleAssign(n.id, v)}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Choose an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>No agent (calls not answered)</SelectItem>
                          {agents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      onClick={() => handleRemove(n)}
                      className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label={`Remove ${n.phone_number}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {agents.length === 0 && (
                <p className="mt-4 text-sm text-amber-600">
                  You have no inbound agents yet. Create one from AI Agents while in inbound mode, then
                  assign it here.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add an inbound number</DialogTitle>
            <DialogDescription>
              Enter the number callers will dial. Any UK format works.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="num">Phone number</Label>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Refreshing…" : "Refresh list"}
                </button>
              </div>
              <Select value={phone} onValueChange={setPhone}>
                <SelectTrigger id="num" className="rounded-xl">
                  <SelectValue placeholder="Choose one of your numbers" />
                </SelectTrigger>
                <SelectContent>
                  {selectable.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-slate-500">
                      No numbers left to add. Press Refresh list if you have just bought one.
                    </div>
                  ) : (
                    selectable.map((n) => (
                      <SelectItem key={n.phone_number} value={n.phone_number} disabled={n.on_trunk === false}>
                        <span className="flex items-center gap-2">
                          {n.phone_number}
                          {n.on_trunk === false && (
                            <span className="text-xs text-amber-600">not on the trunk</span>
                          )}
                          {n.on_trunk === null && <span className="text-xs text-slate-400">unverified</span>}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {/* The reason a number can be ours and still never ring. */}
              {selectable.some((n) => n.on_trunk === false) && (
                <p className="flex items-start gap-1.5 text-xs text-slate-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-px" />
                  Greyed-out numbers are not on your Twilio SIP trunk, so calls to them never reach
                  your agents. Add them to the trunk in Twilio first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl">Label (optional)</Label>
              <Input
                id="lbl"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Main enquiry line"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !phone.trim()}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InboundNumbersPage;
