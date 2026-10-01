import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, FilePlus, Plus, Trash2, RefreshCw, Loader2, Globe, FileText, Type, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listKnowledgeBases,
  createKnowledgeBase,
  addSources,
  deleteKnowledgeBase,
  refreshKnowledgeBase,
  type KnowledgeBase,
} from "@/services/knowledgeBaseService";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx";
const POLL_MS = 4000;

const statusStyles: Record<string, string> = {
  complete: "bg-emerald-50 text-emerald-600",
  in_progress: "bg-amber-50 text-amber-600",
  refreshing_in_progress: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
};

const statusLabel: Record<string, string> = {
  complete: "Ready",
  in_progress: "Indexing",
  refreshing_in_progress: "Refreshing",
  error: "Failed",
};

const KnowledgeBasePage = () => {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [urls, setUrls] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollRef = useRef<number | null>(null);

  // Adding to an existing knowledge base reuses the same three source types as
  // creating one, so the fields are shared and only the target differs.
  const [addTarget, setAddTarget] = useState<KnowledgeBase | null>(null);
  const [addUrls, setAddUrls] = useState("");
  const [addText, setAddText] = useState("");
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [adding, setAdding] = useState(false);

  const handleAddSources = async () => {
    if (!addTarget) return;
    const urlList = addUrls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    const trimmed = addText.trim();
    if (!urlList.length && !trimmed && addFiles.length === 0) {
      toast.error("Add at least one source.");
      return;
    }
    setAdding(true);
    try {
      await addSources(addTarget.retell_kb_id, {
        urls: urlList,
        texts: trimmed ? [{ title: addTarget.name, text: trimmed }] : [],
        files: addFiles,
      });
      toast.success("Sources added. Indexing now.");
      setAddTarget(null);
      setAddUrls("");
      setAddText("");
      setAddFiles([]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add sources.");
    } finally {
      setAdding(false);
    }
  };

  const load = async () => {
    try {
      setBases(await listKnowledgeBases());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load knowledge bases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Indexing is asynchronous on Retell's side, so poll only while something is
  // actually mid-flight and stop as soon as everything has settled.
  useEffect(() => {
    const pending = bases.filter((b) => b.status === "in_progress" || b.status === "refreshing_in_progress");
    if (pending.length === 0) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(async () => {
      await Promise.all(pending.map((b) => refreshKnowledgeBase(b.retell_kb_id).catch(() => undefined)));
      load();
    }, POLL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [bases]);

  const reset = () => {
    setName("");
    setUrls("");
    setText("");
    setFiles([]);
    setAutoRefresh(true);
  };

  const handleCreate = async () => {
    const urlList = urls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    const trimmedText = text.trim();
    if (!name.trim()) return;
    if (!urlList.length && !trimmedText && files.length === 0) {
      toast.error("Add at least one source: a web page, a document or some text.");
      return;
    }
    setSaving(true);
    try {
      await createKnowledgeBase({
        name: name.trim(),
        urls: urlList,
        texts: trimmedText ? [{ title: name.trim(), text: trimmedText }] : [],
        files,
        autoRefresh,
      });
      toast.success(`"${name.trim()}" created. Indexing now.`);
      setOpen(false);
      reset();
      setLoading(true);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the knowledge base.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kb: KnowledgeBase) => {
    if (!window.confirm(`Delete "${kb.name}"? Agents using it will lose this knowledge.`)) return;
    try {
      await deleteKnowledgeBase(kb.retell_kb_id);
      setBases((prev) => prev.filter((b) => b.id !== kb.id));
      toast.success("Knowledge base deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  const handleRefresh = async (kb: KnowledgeBase) => {
    try {
      await refreshKnowledgeBase(kb.retell_kb_id);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh.");
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Knowledge Base"
          subtitle="Facts your agents can look up mid-call: course details, pricing, FAQs, policies."
          actions={
            <Button
              onClick={() => setOpen(true)}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Knowledge Base
            </Button>
          }
        />

        <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 mb-6 text-sm text-slate-600">
          A knowledge base works alongside an agent's script. The script sets how the agent talks; the
          knowledge base is what it can look up. Attach one to any agent, inbound or outbound, from the
          agent's edit screen.
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading knowledge bases…
          </div>
        ) : bases.length === 0 ? (
          <Card className="bg-white rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No knowledge bases yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Add your website, a price list or an FAQ document, and your agents can answer questions
                about it accurately instead of improvising.
              </p>
              <Button
                onClick={() => setOpen(true)}
                className="mt-6 bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Knowledge Base
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bases.map((kb) => (
              <Card key={kb.id} className="bg-white rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#FF6FD8] flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        statusStyles[kb.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {statusLabel[kb.status] ?? kb.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 truncate">{kb.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {kb.source_count} source{kb.source_count === 1 ? "" : "s"}
                    {kb.auto_refresh ? " · auto-refreshing daily" : ""}
                  </p>

                  {kb.missing_upstream && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Missing in Retell. Delete and recreate it.
                    </p>
                  )}

                  {!!kb.sources?.length && (
                    <ul className="mt-3 space-y-1">
                      {kb.sources.slice(0, 3).map((s) => (
                        <li key={s.source_id} className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                          {s.type === "url" ? (
                            <Globe className="h-3 w-3 shrink-0" />
                          ) : s.type === "text" ? (
                            <Type className="h-3 w-3 shrink-0" />
                          ) : (
                            <FileText className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{s.title || s.url || s.filename || s.type}</span>
                        </li>
                      ))}
                      {kb.sources.length > 3 && (
                        <li className="text-xs text-slate-400">+{kb.sources.length - 3} more</li>
                      )}
                    </ul>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setAddTarget(kb)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      <FilePlus className="h-3.5 w-3.5" /> Add
                    </button>
                    <button
                      onClick={() => handleRefresh(kb)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                    <button
                      onClick={() => handleDelete(kb)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
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

      <Dialog open={Boolean(addTarget)} onOpenChange={(o) => !o && setAddTarget(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to {addTarget?.name}</DialogTitle>
            <DialogDescription>
              New sources are indexed alongside what's already there. Nothing existing is replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addUrls">Web pages</Label>
              <Textarea
                id="addUrls"
                value={addUrls}
                onChange={(e) => setAddUrls(e.target.value)}
                placeholder="https://yoursite.co.uk/new-course"
                className="rounded-xl min-h-[72px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addText">Notes</Label>
              <Textarea
                id="addText"
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                placeholder="Anything else the agent should know."
                className="rounded-xl min-h-[96px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addFiles">Documents</Label>
              <Input
                id="addFiles"
                type="file"
                multiple
                accept={ACCEPT}
                onChange={(e) => setAddFiles(Array.from(e.target.files ?? []))}
                className="rounded-xl"
              />
              {addFiles.length > 0 && (
                <p className="text-xs text-slate-500">{addFiles.length} file(s) selected</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddTarget(null)} className="rounded-xl" disabled={adding}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSources}
              disabled={adding}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add sources"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New knowledge base</DialogTitle>
            <DialogDescription>
              Add any mix of web pages, documents and written notes. You can add more later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kbName">Name</Label>
              <Input
                id="kbName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Courses and fees"
                maxLength={40}
                className="rounded-xl"
              />
              <p className="text-xs text-slate-400">{name.length}/40</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kbUrls">Web pages</Label>
              <Textarea
                id="kbUrls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://yoursite.co.uk/courses&#10;https://yoursite.co.uk/fees"
                className="rounded-xl min-h-[72px]"
              />
              <p className="text-xs text-slate-400">One per line. We read the page and keep it up to date.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kbText">Notes</Label>
              <Textarea
                id="kbText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Anything the agent should know that isn't written down elsewhere."
                className="rounded-xl min-h-[96px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kbFiles">Documents</Label>
              <Input
                id="kbFiles"
                type="file"
                multiple
                accept={ACCEPT}
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="rounded-xl"
              />
              {files.length > 0 && (
                <p className="text-xs text-slate-500">
                  {files.length} file{files.length === 1 ? "" : "s"} selected
                </p>
              )}
              <p className="text-xs text-slate-400">PDF, Word, text, Markdown or spreadsheets. Up to 50MB each.</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Keep web pages up to date</p>
                <p className="text-xs text-slate-500">Re-reads any linked pages once a day.</p>
              </div>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default KnowledgeBasePage;
