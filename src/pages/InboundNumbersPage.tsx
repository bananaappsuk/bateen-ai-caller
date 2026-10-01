import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hash, Plus, Trash2, Loader2, PhoneIncoming } from "lucide-react";
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
  type InboundNumber,
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

  const load = async () => {
    try {
      const [nums, all] = await Promise.all([listInboundNumbers(), listAgents()]);
      setNumbers(nums);
      // Only inbound agents can answer a number.
      setAgents(all.filter((a) => a.direction === "inbound"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load numbers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const normalized = normalizeUkPhone(phone);
    if (!normalized) {
      toast.error("Enter a valid UK number, e.g. 07700 900123.");
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
      const msg = err instanceof Error ? err.message : "Could not add the number.";
      toast.error(/duplicate|unique/i.test(msg) ? "That number is already set up." : msg);
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
              <Label htmlFor="num">Phone number</Label>
              <Input
                id="num"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07700 900123"
                className="rounded-xl"
              />
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
