import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/ai-tele-caller-logo.png";
import { academyCategories, academyLessons, type AcademyCategory } from "@/data/academyLessons";
import { useAcademyProgress } from "@/hooks/use-academy-progress";
import AcademyVideoPlayer from "@/components/academy/AcademyVideoPlayer";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Bot, label: "AI Agents", href: "/ai-agents" },
  { icon: PhoneOutgoing, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
  { icon: GraduationCap, label: "Academy", href: "/dashboard/academy", locked: true },
  { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
];

const categories = academyCategories;
type Category = AcademyCategory;

const AcademyPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [activeCategory, setActiveCategory] = useState<Category>("Getting Started");
  const [searchQuery, setSearchQuery] = useState("");
  const tutorials = academyLessons;
  const { getProgress, recordProgress } = useAcademyProgress();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

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

  const selectedIndex = tutorials.findIndex((t) => t.id === selectedLessonId);
  const selectedLesson = selectedIndex >= 0 ? tutorials[selectedIndex] : null;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < tutorials.length - 1;
  const goToLesson = (id: string) => setSelectedLessonId(id);

  const filteredTutorials = tutorials.filter((t) => {
    const matchesCategory = t.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        <div className="w-full px-6 py-8">
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
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">AI Tele Caller Academy</h2>
                <p className="text-sm sm:text-base text-white/90">
                  Learn how to use the AI Tele Caller platform.
                </p>
              </div>
              <div
                className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
                aria-hidden="true"
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white ml-1" />
              </div>
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
              {filteredTutorials.map((tutorial) => {
                const lessonProgress = getProgress(tutorial.id);
                const watchedPct =
                  lessonProgress && lessonProgress.duration > 0
                    ? Math.min(100, (lessonProgress.position / lessonProgress.duration) * 100)
                    : 0;
                return (
                  <div
                    key={tutorial.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => goToLesson(tutorial.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") goToLesson(tutorial.id);
                    }}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                      {tutorial.thumbnail && (
                        <img
                          src={tutorial.thumbnail}
                          alt={tutorial.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="relative h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                      </div>
                      {lessonProgress?.completed && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tutorial.duration}
                      </span>
                      {watchedPct > 0 && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8]"
                            style={{ width: `${watchedPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-1">
                        {tutorial.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{tutorial.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Lesson Player */}
      <Dialog open={Boolean(selectedLesson)} onOpenChange={(open) => !open && setSelectedLessonId(null)}>
        <DialogContent className="max-w-3xl">
          {selectedLesson && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{selectedLesson.title}</DialogTitle>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <Clock className="h-3 w-3" />
                    {selectedLesson.duration}
                  </span>
                  {getProgress(selectedLesson.id)?.completed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  )}
                </div>
                <DialogDescription>{selectedLesson.description}</DialogDescription>
              </DialogHeader>

              <AcademyVideoPlayer
                lessonId={selectedLesson.id}
                src={selectedLesson.videoSrc}
                initialPosition={getProgress(selectedLesson.id)?.position ?? 0}
                autoPlay
                onProgress={(time, duration) => recordProgress(selectedLesson.id, time, duration)}
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && goToLesson(tutorials[selectedIndex - 1].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous lesson
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && goToLesson(tutorials[selectedIndex + 1].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Next lesson
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademyPage;
