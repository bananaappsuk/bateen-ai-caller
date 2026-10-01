import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  PhoneOutgoing,
  PhoneIncoming,
  Hash,
  Users,
  BookOpen,
  Settings as SettingsIcon,
  GraduationCap,
  LifeBuoy,
  Lock,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getDevUser, canAccessRoute, devSignOut } from "@/lib/devAuth";
import { useCallMode, type CallMode } from "@/lib/callMode";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";

// Single source of truth for the dashboard shell. Every dashboard page used to
// carry its own copy of this sidebar (15 near-identical duplicates that had
// already drifted), so any nav change meant editing 15 files.

// Outbound dials lead lists from campaigns; inbound answers numbers. They have
// separate agents, screens and data, so the nav swaps wholesale with the mode.
const OUTBOUND_NAV = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
];

const INBOUND_NAV = [
  { icon: LayoutDashboard, label: "Overview", href: "/inbound" },
  { icon: Bot, label: "AI Agents", href: "/inbound/agents" },
  { icon: Hash, label: "Numbers", href: "/inbound/numbers" },
  { icon: PhoneIncoming, label: "Calls", href: "/inbound/calls" },
  { icon: Users, label: "Enquiries", href: "/inbound/enquiries" },
];

// Knowledge bases, billing and help are the same whichever way the calls go.
const SHARED_NAV = [
  { icon: BookOpen, label: "Knowledge Base", href: "/dashboard/knowledge-base" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

export const navItemsFor = (mode: CallMode) => [
  ...(mode === "inbound" ? INBOUND_NAV : OUTBOUND_NAV),
  ...SHARED_NAV,
];

const MODE_HOME: Record<CallMode, string> = { outbound: "/dashboard", inbound: "/inbound" };

interface DashboardLayoutProps {
  children: ReactNode;
  /**
   * Keeps a parent nav item highlighted on pages that aren't the nav target
   * themselves — e.g. the campaign detail page highlights "Campaigns".
   */
  activeHref?: string;
  /**
   * The full-height form pages (create/edit agent, create campaign) need
   * `h-screen flex flex-col` for their sticky footer instead of the default
   * scrolling `min-h-screen`.
   */
  mainClassName?: string;
}

const DashboardLayout = ({
  children,
  activeHref,
  mainClassName = "flex-1 ml-[260px] min-h-screen",
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const user = getDevUser();
  const { mode, setMode } = useCallMode();
  if (!user) return null;

  const visibleNav = navItemsFor(mode).filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  // Switching mode also moves you to that side's overview — staying on, say,
  // Campaigns while in inbound mode would show a screen the mode has no nav for.
  const switchMode = (next: CallMode) => {
    if (next === mode) return;
    setMode(next);
    navigate(MODE_HOME[next]);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <img src={logo} alt="AI Tele Caller" className="h-8 w-auto" />
          <span className="font-semibold text-slate-900 tracking-tight">AI Tele Caller</span>
        </div>

        {/* Outbound / inbound switch */}
        <div className="px-4 pt-4">
          <div role="tablist" aria-label="Call direction" className="flex p-1 bg-slate-100 rounded-xl">
            {(["outbound", "inbound"] as CallMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                  mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {m === "outbound" ? <PhoneOutgoing className="h-3.5 w-3.5" /> : <PhoneIncoming className="h-3.5 w-3.5" />}
                {m}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive || item.href === activeHref
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )
                  }
                  end={item.href === "/dashboard" || item.href === "/inbound"}
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
      <main className={mainClassName}>{children}</main>
    </div>
  );
};

export default DashboardLayout;
