import { useEffect, useMemo, useState } from "react";
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
  CreditCard,
  Settings,
  Plus,
  MessageSquare,
  FileText,
  Code,
  Activity,
  Ticket,
  X,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const quickLinks = [
  { icon: FileText, label: "Documentation", href: "#" },
  { icon: Code, label: "API Reference", href: "#" },
  { icon: Activity, label: "System Status", href: "#" },
];

type TicketCategory = "General" | "Campaigns" | "AI Agents" | "Billing" | "Technical";
type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  createdAt: string;
}

const TICKETS_KEY = "ai_telecaller_support_tickets";

const priorityColors: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-50 text-blue-600",
  High: "bg-orange-50 text-orange-600",
  Urgent: "bg-red-50 text-red-600",
};

const statusColors: Record<SupportTicket["status"], string> = {
  Open: "bg-cyan-50 text-cyan-600",
  "In Progress": "bg-purple-50 text-purple-600",
  Resolved: "bg-emerald-50 text-emerald-600",
  Closed: "bg-slate-100 text-slate-600",
};

const SupportPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const raw = localStorage.getItem(TICKETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("General");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }, [tickets]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: SupportTicket = {
      id: `T-${Date.now()}`,
      subject: subject.trim() || "Untitled ticket",
      category,
      priority,
      description: description.trim() || "No description provided.",
      status: "Open",
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
    setTickets((prev) => [newTicket, ...prev]);
    setSubject("");
    setCategory("General");
    setPriority("Medium");
    setDescription("");
    setModalOpen(false);
  };

  const handleClose = (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "Closed" } : t))
    );
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Center</h1>
              <p className="text-sm text-slate-500 mt-1">
                Get help with campaigns, AI agents, and technical issues.
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
                onClick={() => navigate("/dashboard/settings")}
              >
                <Settings className="h-4 w-4" />
              </button>
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Ticket
              </Button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets */}
            <Card className="lg:col-span-2 bg-white rounded-2xl border-slate-100 shadow-sm">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900">Your Tickets</CardTitle>
                <span className="text-xs text-slate-500">{tickets.length} total</span>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Ticket className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">No tickets found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      You have not created any support tickets yet. Click "New Ticket" to get help.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-400">{ticket.id}</span>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[ticket.status])}>
                              {ticket.status}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[ticket.priority])}>
                              {ticket.priority}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900">{ticket.subject}</h4>
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{ticket.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {ticket.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ticket.createdAt}
                            </span>
                          </div>
                        </div>
                        {ticket.status !== "Closed" && ticket.status !== "Resolved" && (
                          <button
                            onClick={() => handleClose(ticket.id)}
                            className="shrink-0 self-start p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                            aria-label="Close ticket"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white rounded-2xl border-slate-100 shadow-sm h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-900">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-2">
                  {quickLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                        <link.icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{link.label}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* New Ticket Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">New Support Ticket</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Describe your issue and we will get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                  <SelectTrigger id="category" className="rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Campaigns">Campaigns</SelectItem>
                    <SelectItem value="AI Agents">AI Agents</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger id="priority" className="rounded-xl">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details so we can help faster"
                className="rounded-xl min-h-[120px]"
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white hover:opacity-90 rounded-xl"
              >
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPage;
