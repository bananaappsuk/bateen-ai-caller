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
  Play,
  Search,
  Clock,
  MoreVertical,
  BookOpen,
  Plus,
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

const categories = [
  "Getting Started",
  "AI Agents",
  "Campaigns",
  "Adding Credits",
  "Leads",
  "Support",
] as const;
type Category = (typeof categories)[number];

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: Category;
  thumbnail: string;
  videoUrl: string;
}

const TUTORIALS_KEY = "ai_academy_tutorials";

const defaultTutorials: Tutorial[] = [
  {
    id: "tut_1",
    title: "Welcome to VocalMax",
    description: "A quick overview of the platform and how to navigate your dashboard.",
    duration: "3:45",
    category: "Getting Started",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "tut_2",
    title: "Create Your First AI Agent",
    description: "Learn how to build a voice agent, choose a voice, and write a call script.",
    duration: "6:12",
    category: "AI Agents",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "tut_3",
    title: "Launch a Campaign",
    description: "Upload leads, assign an agent, and start your first outbound campaign.",
    duration: "5:30",
    category: "Campaigns",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "tut_4",
    title: "Adding Credits",
    description: "How to top up your account and manage billing preferences.",
    duration: "2:50",
    category: "Adding Credits",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "tut_5",
    title: "Scoring & Managing Leads",
    description: "Understand lead statuses, scores, and how to follow up effectively.",
    duration: "4:18",
    category: "Leads",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "tut_6",
    title: "Getting Help",
    description: "Where to find support, documentation, and contact the team.",
    duration: "2:15",
    category: "Support",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
];

const loadTutorials = (): Tutorial[] => {
  try {
    const raw = localStorage.getItem(TUTORIALS_KEY);
    return raw ? JSON.parse(raw) : defaultTutorials;
  } catch {
    return defaultTutorials;
  }
};

const AcademyPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [activeCategory, setActiveCategory] = useState<Category>("Getting Started");
  const [searchQuery, setSearchQuery] = useState("");
  const [tutorials] = useState<Tutorial[]>(loadTutorials);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canAccessRoute(user, item.href));

  const handleSignOut = () => {
    devSignOut();
    navigate("/login", { replace: true });
  };

  const filteredTutorials = useMemo(() => {
    return tutorials.filter((t) => {
      const matchesCategory = t.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [tutorials, activeCategory, searchQuery]);

  const handlePlay = (tutorial: Tutorial) => {
    setPlayingVideo(tutorial.id);
  };

  const closeVideo = () => {
    setPlayingVideo(null);
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
              <h1 className="text-2xl font-bold text-slate-900">Academy</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage courses, learning resources, and training materials.
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
            </div>
          </div>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] p-8 sm:p-10 mb-8 shadow-md">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">VocalMax Academy</h2>
                <p className="text-sm sm:text-base text-white/90">
                  Learn how to get the most out of the platform
                </p>
              </div>
              <button
                onClick={() => {
                  const first = tutorials[0];
                  if (first) setPlayingVideo(first.id);
                }}
                className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/30"
                aria-label="Play academy intro video"
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white ml-1" />
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-white/10" />
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 shadow-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="mb-6 border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                      isActive
                        ? "border-cyan-500 text-cyan-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tutorial Cards */}
          {filteredTutorials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No Tutorials Available</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                There are no tutorials in this category yet. Check back soon or try another category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={tutorial.thumbnail}
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handlePlay(tutorial)}
                        className="h-12 w-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                        aria-label={`Play ${tutorial.title}`}
                      >
                        <Play className="h-5 w-5 text-slate-900 fill-slate-900 ml-0.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.duration}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-1">
                      {tutorial.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{tutorial.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Video Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeVideo}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              {(() => {
                const tutorial = tutorials.find((t) => t.id === playingVideo);
                if (!tutorial) return null;
                const videoId = tutorial.videoUrl.includes("v=")
                  ? tutorial.videoUrl.split("v=")[1].split("&")[0]
                  : "";
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title={tutorial.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              })()}
              <button
                onClick={closeVideo}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Close video"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {tutorials.find((t) => t.id === playingVideo)?.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {tutorials.find((t) => t.id === playingVideo)?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyPage;
