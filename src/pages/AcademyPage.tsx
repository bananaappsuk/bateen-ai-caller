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
  BookOpen,
  Plus,
  PlayCircle,
  Award,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  BookMarked,
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

const tabs = ["Courses", "My Learning", "Resources", "Certificates"] as const;
type Tab = (typeof tabs)[number];

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "Draft" | "Published";
  createdAt: string;
}

const COURSES_KEY = "ai_academy_courses";

const loadCourses = (): Course[] => {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCourses = (courses: Course[]) => {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
};

const levelStyles: Record<Course["level"], string> = {
  Beginner: "bg-emerald-50 text-emerald-600",
  Intermediate: "bg-amber-50 text-amber-600",
  Advanced: "bg-red-50 text-red-600",
};

const statusStyles: Record<Course["status"], string> = {
  Draft: "bg-slate-100 text-slate-600",
  Published: "bg-cyan-50 text-cyan-600",
};

const AcademyPage = () => {
  const navigate = useNavigate();
  const user = getDevUser();
  const [activeTab, setActiveTab] = useState<Tab>("Courses");
  const [courses, setCourses] = useState<Course[]>(loadCourses);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    lessons: 1,
    duration: "",
    level: "Beginner" as Course["level"],
    status: "Draft" as Course["status"],
  });

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

  const handleAddCourse = () => {
    setEditingCourse(null);
    setForm({
      title: "",
      description: "",
      lessons: 1,
      duration: "",
      level: "Beginner",
      status: "Draft",
    });
    setShowAddModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description,
      lessons: course.lessons,
      duration: course.duration,
      level: course.level,
      status: course.status,
    });
    setMenuOpen(null);
    setShowAddModal(true);
  };

  const handleDeleteCourse = (id: string) => {
    const updated = courses.filter((c) => c.id !== id);
    setCourses(updated);
    saveCourses(updated);
    setMenuOpen(null);
  };

  const handleSaveCourse = () => {
    if (!form.title.trim() || !form.duration.trim()) return;
    if (editingCourse) {
      const updated = courses.map((c) =>
        c.id === editingCourse.id
          ? { ...c, ...form, updatedAt: new Date().toISOString() }
          : c
      );
      setCourses(updated);
      saveCourses(updated);
    } else {
      const newCourse: Course = {
        id: "course_" + Date.now(),
        title: form.title,
        description: form.description,
        lessons: form.lessons,
        duration: form.duration,
        level: form.level,
        status: form.status,
        createdAt: new Date().toISOString(),
      };
      const updated = [...courses, newCourse];
      setCourses(updated);
      saveCourses(updated);
    }
    setShowAddModal(false);
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

          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((t) => {
                const isActive = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                      isActive
                        ? "border-cyan-500 text-cyan-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {activeTab === "Courses" && (
            <>
              {courses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-slate-300" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">No Courses Available</h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Create your first course to start training your team on AI outbound calling.
                  </p>
                  <button
                    onClick={handleAddCourse}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                    Add Course
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">
                      {courses.length} course{courses.length > 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={handleAddCourse}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                    >
                      <Plus className="h-4 w-4" />
                      Add Course
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow relative"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/10 to-[#FF6FD8]/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-cyan-500" />
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === course.id ? null : course.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {menuOpen === course.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-10 overflow-hidden">
                                <button
                                  onClick={() => handleEditCourse(course)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-1">{course.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <PlayCircle className="h-3.5 w-3.5" />
                            {course.lessons} lessons
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {course.duration}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              levelStyles[course.level]
                            )}
                          >
                            {course.level}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              statusStyles[course.status]
                            )}
                          >
                            {course.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "My Learning" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <PlayCircle className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">My Learning</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Track your progress on enrolled courses. Start a course from the Courses tab to see it here.
              </p>
            </div>
          )}

          {activeTab === "Resources" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Downloadable guides, scripts, and reference materials will be available here soon.
              </p>
            </div>
          )}

          {activeTab === "Certificates" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Certificates</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Earn certificates by completing courses. Your achievements will appear here.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCourse ? "Edit Course" : "Add Course"}
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
                  placeholder="Course title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 min-h-[80px] resize-none"
                  placeholder="Brief description of the course"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lessons</label>
                  <input
                    type="number"
                    min={1}
                    value={form.lessons}
                    onChange={(e) => setForm({ ...form, lessons: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
                    placeholder="e.g. 45 min"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as Course["level"] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 bg-white"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Course["status"] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 bg-white"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCourse}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#FF6FD8] text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                {editingCourse ? "Save Changes" : "Create Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyPage;
