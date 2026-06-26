"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Share2,
  UserRound,
  UserRoundCog,
  X,
  Bell,
  ChevronDown,
  Settings
} from "lucide-react";
import { FaGithub } from "react-icons/fa";

import { createClient } from "@/app/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Contest = {
  title: string;
  url: string;
  startTime: string;
  endTime: string;
  duration: number;
  platform: string;
};

type CalendarDashboardProps = {
  profile: any;
};

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function CalendarDashboard({ profile }: CalendarDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Dropdown click outside handler
  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#profile-dropdown-container")) {
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isProfileDropdownOpen]);

  // Initialise theme from sessionStorage or system preference
  useEffect(() => {
    const activeTheme = sessionStorage.getItem("theme");
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (activeTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Platform Filters
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "codeforces",
    "codechef",
    "leetcode",
    "atcoder",
  ]);

  // Fetch all contests
  useEffect(() => {
    let alive = true;
    const fetchContests = async () => {
      try {
        setLoading(true);
        const res = await fetch("https://contest-hive.vercel.app/api/all");
        if (!res.ok) {
          throw new Error("Failed to load contest schedule");
        }
        const json = await res.json();
        if (!json.ok || !json.data) {
          throw new Error("Invalid response format from api");
        }

        if (!alive) return;

        const allContests: Contest[] = [];
        const data = json.data;

        // Normalise the names and structure of contests
        Object.keys(data).forEach((key) => {
          const list = data[key] || [];
          list.forEach((item: any) => {
            allContests.push({
              title: item.title,
              url: item.url,
              startTime: item.startTime,
              endTime: item.endTime,
              duration: item.duration,
              platform: (item.platform || key).toLowerCase(),
            });
          });
        });

        // Sort by start time ascending
        allContests.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        setContests(allContests);
      } catch (err: any) {
        if (!alive) return;
        setError(err.message || "Failed to load contest calendar.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchContests();
    return () => {
      alive = false;
    };
  }, []);

  // Filtered contests
  const filteredContests = useMemo(() => {
    return contests.filter((c) => selectedPlatforms.includes(c.platform));
  }, [contests, selectedPlatforms]);

  // Group contests by local date string
  const contestsByDate = useMemo(() => {
    const groups: Record<string, Contest[]> = {};
    filteredContests.forEach((c) => {
      const dateStr = getLocalDateString(new Date(c.startTime));
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(c);
    });
    return groups;
  }, [filteredContests]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${d.getDate()}`,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    // Next month padding days to fill 42 cells (6 rows)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Contests on selected date
  const selectedDateStr = getLocalDateString(selectedDate);
  const selectedDateContests = contestsByDate[selectedDateStr] || [];

  // Upcoming contests list (from today onwards)
  const upcomingContests = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return filteredContests.filter((c) => new Date(c.startTime).getTime() >= todayStart.getTime());
  }, [filteredContests]);

  const getPlatformConfig = (platform: string) => {
    switch (platform) {
      case "leetcode":
        return {
          name: "LeetCode",
          dotColor: "bg-amber-500",
          textColor: "text-amber-600 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-900/50",
          bgColor: "bg-amber-50 dark:bg-amber-950/20",
        };
      case "codeforces":
        return {
          name: "Codeforces",
          dotColor: "bg-blue-500",
          textColor: "text-blue-600 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-900/50",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
        };
      case "codechef":
        return {
          name: "CodeChef",
          dotColor: "bg-emerald-600 dark:bg-emerald-500",
          textColor: "text-emerald-700 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-900/50",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
        };
      case "atcoder":
        return {
          name: "AtCoder",
          dotColor: "bg-purple-500",
          textColor: "text-purple-600 dark:text-purple-400",
          borderColor: "border-purple-200 dark:border-purple-900/50",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
        };
      default:
        return {
          name: platform.toUpperCase(),
          dotColor: "bg-zinc-500",
          textColor: "text-zinc-600 dark:text-zinc-400",
          borderColor: "border-zinc-200 dark:border-zinc-900/50",
          bgColor: "bg-zinc-50 dark:bg-zinc-950/20",
        };
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const getGoogleCalendarUrl = (contest: Contest) => {
    const start = new Date(contest.startTime);
    const durationMs = contest.duration * 1000 || 7200000; // default 2h if not provided
    const end = contest.endTime ? new Date(contest.endTime) : new Date(start.getTime() + durationMs);

    const formatGCalDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const dates = `${formatGCalDate(start)}/${formatGCalDate(end)}`;
    const text = encodeURIComponent(contest.title);
    const details = encodeURIComponent(`Platform: ${getPlatformConfig(contest.platform).name}\nDirect Link: ${contest.url}`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&sf=true&output=xml`;
  };

  const publicProfilePath = profile?.username ? `/u/${encodeURIComponent(profile.username)}` : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black p-4 md:p-8 font-sans selection:bg-zinc-300 dark:selection:bg-zinc-700">
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[420px] opacity-40 dark:opacity-20">
        <div className="absolute -top-[100px] -left-[10%] w-[120%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 via-transparent to-transparent dark:from-zinc-800" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1450px] overflow-hidden rounded-[26px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Component */}
        <aside className={`absolute inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950 transition-transform duration-300 lg:static lg:bg-white/35 lg:dark:bg-zinc-950/30 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-5 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-black dark:text-white">CodeAtlas</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Unified coding analytics</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-7 px-4 py-6 text-[15px]">
            <div className="space-y-2">
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  if (publicProfilePath) {
                    router.push(publicProfilePath);
                  } else {
                    router.push("/dashboard");
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  router.push("/dashboard/links");
                  setIsSidebarOpen(false);
                }}
              >
                <UserRoundCog className="h-4 w-4" />
                Manage Links
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 font-semibold text-zinc-900 dark:text-zinc-100"
                onClick={() => {
                  setIsSidebarOpen(false);
                }}
              >
                <Calendar className="h-4 w-4" />
                Calender
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  router.push("/");
                  setIsSidebarOpen(false);
                }}
              >
                <Home className="h-4 w-4" />
                Back To Home
              </button>
            </div>
            <Separator className="bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2">
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  if (publicProfilePath) {
                    router.push(`${publicProfilePath}`);
                  } else {
                    router.push("/dashboard");
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <FaGithub className="h-4 w-4" />
                GitHub
              </button>
              <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-500 dark:text-zinc-400">
                <BookOpenText className="h-4 w-4" />
                Documentation
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80 p-4">
            <Button
              className="w-full justify-start gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-red-500 dark:text-white dark:hover:bg-red-200 active:scale-97"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 bg-white/15 dark:bg-zinc-950/10 flex flex-col">
          {/* Header */}
          <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-black dark:text-white">
                  Contest Calendar
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" id="profile-dropdown-container">
                  <div
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 cursor-pointer transition select-none shadow-sm animate-fade-in"
                  >
                    {/* Circular Avatar Container */}
                    <div className="relative h-7 w-7 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {(() => {
                        let avatarUrl = "";
                        if (profile?.about) {
                          try {
                            const parsed = JSON.parse(profile.about);
                            avatarUrl = parsed.avatar_url || "";
                          } catch (e) {}
                        }
                        if (avatarUrl) {
                          return (
                            <img
                              src={avatarUrl}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          );
                        }
                        return <UserRound className="h-4 w-4 text-zinc-500" />;
                      })()}
                    </div>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">
                      {profile?.username || "Developer"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
                  </div>

                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-1.5 shadow-lg z-50 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          router.push("/settings");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          router.push("/dashboard/links");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium"
                      >
                        <UserRoundCog className="h-4 w-4" />
                        Manage Links
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          // Redirect to dashboard where the profile card component is, or we can just navigate to dashboard and show card
                          router.push("/dashboard");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium"
                      >
                        <Share2 className="h-4 w-4" />
                        Profile Card
                      </button>
                      {publicProfilePath && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            window.open(publicProfilePath, "_blank", "noopener,noreferrer");
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition font-medium border-t border-zinc-100 dark:border-zinc-900 pt-2"
                        >
                          <UserRound className="h-4 w-4" />
                          View Public Profile
                        </button>
                      )}
                      <Separator className="my-1 bg-zinc-100 dark:bg-zinc-900" />
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition font-semibold"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="flex-1 space-y-5 px-4 py-5 md:px-6 md:py-6 overflow-y-auto">
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span>Loading coding contests schedule...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Calendar Grid */}
                <Card className="xl:col-span-8 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm overflow-hidden">
                  
                  {/* Calendar Top Controls */}
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={prevMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 w-32 text-center">
                        {currentDate.toLocaleString("default", { month: "long" })} {year}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={nextMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        onClick={jumpToToday}
                      >
                        Today
                      </Button>
                    </div>

                    {/* Platform Filter Pills */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">Platforms:</span>
                      {["leetcode", "codeforces", "codechef", "atcoder"].map((platform) => {
                        const active = selectedPlatforms.includes(platform);
                        const cfg = getPlatformConfig(platform);
                        return (
                          <button
                            key={platform}
                            onClick={() => togglePlatform(platform)}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition flex items-center gap-1.5 ${
                              active
                                ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.textColor} shadow-sm font-semibold`
                                : "border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${active ? cfg.dotColor : "bg-zinc-300 dark:bg-zinc-700"}`} />
                            {cfg.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calendar Grid Body */}
                  <CardContent className="p-4">
                    {/* Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs tracking-wider text-zinc-400 dark:text-zinc-500 uppercase pb-2 border-b border-zinc-100 dark:border-zinc-900">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    {/* Month Days */}
                    <div className="grid grid-cols-7 gap-1.5 mt-2">
                      {calendarDays.map((cell) => {
                        const dateStr = getLocalDateString(cell.date);
                        const dayContests = contestsByDate[dateStr] || [];
                        
                        const isToday = getLocalDateString(new Date()) === dateStr;
                        const isSelected = getLocalDateString(selectedDate) === dateStr;

                        return (
                          <button
                            key={cell.key}
                            onClick={() => setSelectedDate(cell.date)}
                            className={`min-h-[70px] md:min-h-[85px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition relative overflow-hidden group ${
                              cell.isCurrentMonth
                                ? "bg-white/40 dark:bg-zinc-950/20 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-white/80 dark:hover:bg-zinc-900/40"
                                : "bg-zinc-50/10 dark:bg-zinc-900/5 border-zinc-100 dark:border-zinc-900/50 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100/30 dark:hover:bg-zinc-850/10"
                            } ${
                              isToday
                                ? "border-violet-500/80 dark:border-violet-400/80 ring-1 ring-violet-500/40 dark:ring-violet-400/20 bg-violet-500/5 dark:bg-violet-950/10"
                                : ""
                            } ${
                              isSelected
                                ? "border-black dark:border-white ring-2 ring-black/10 dark:ring-white/10 bg-zinc-100/70 dark:bg-zinc-800/40"
                                : ""
                            }`}
                          >
                            {/* Date Number */}
                            <span className={`text-sm font-semibold tracking-tight ${
                              isToday 
                                ? "text-violet-600 dark:text-violet-400 font-bold" 
                                : cell.isCurrentMonth 
                                  ? "text-zinc-900 dark:text-zinc-200" 
                                  : "text-zinc-400 dark:text-zinc-650"
                            }`}>
                              {cell.date.getDate()}
                            </span>

                            {/* Contest Dots / Visual Indicators */}
                            {dayContests.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                                {dayContests.slice(0, 3).map((contest, idx) => {
                                  const cfg = getPlatformConfig(contest.platform);
                                  return (
                                    <span
                                      key={idx}
                                      className={`h-2 w-2 rounded-full ${cfg.dotColor} shadow-sm`}
                                      title={`${cfg.name}: ${contest.title}`}
                                    />
                                  );
                                })}
                                {dayContests.length > 3 && (
                                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">
                                    +{dayContests.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Hover Date Details (desktop only tooltip effect) */}
                            {dayContests.length > 0 && (
                              <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-400 opacity-0 group-hover:opacity-100 transition" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Right side: Selected Day Details & All Upcoming Contests */}
                <div className="xl:col-span-4 space-y-6">
                  
                  {/* Selected Day Contests Card */}
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <CardTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </CardTitle>
                      <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        {selectedDateContests.length} {selectedDateContests.length === 1 ? "contest" : "contests"} scheduled
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-4 space-y-3.5 max-h-[350px] overflow-y-auto
                    scrollbar-thin 
                    [&::-webkit-scrollbar]:w-1.5
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-zinc-300
                    dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800
                    hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400
                    dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                    ">
                      {selectedDateContests.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                          No contests scheduled for this date. Select another day to see details.
                        </div>
                      ) : (
                        selectedDateContests.map((contest, index) => {
                          const cfg = getPlatformConfig(contest.platform);
                          const startTime = new Date(contest.startTime);

                          return (
                            <div
                              key={index}
                              className={`p-3.5 rounded-xl border ${cfg.borderColor} bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition flex flex-col gap-2`}
                            >
                              <div className="flex items-center justify-between">
                                <Badge className={`${cfg.bgColor} ${cfg.borderColor} ${cfg.textColor} border text-[11px] font-semibold rounded-lg hover:${cfg.bgColor}`}>
                                  {cfg.name}
                                </Badge>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                  {formatDuration(contest.duration)}
                                </span>
                              </div>
                              <h4 className="font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-100">
                                {contest.title}
                              </h4>
                              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-900/50">
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                                  {startTime.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={getGoogleCalendarUrl(contest)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition"
                                    title="Add to Google Calendar"
                                  >
                                    <Bell className="h-3.5 w-3.5" />
                                  </a>
                                  <a
                                    href={contest.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-bold transition shadow-sm"
                                  >
                                    Register
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  {/* All Upcoming Contests Card */}
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm overflow-hidden flex flex-col max-h-[380px]">
                    <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        All Upcoming Contests
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-zinc-150 dark:divide-zinc-900
                    scrollbar-thin 
                    [&::-webkit-scrollbar]:w-1.5
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-zinc-300
                    dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800
                    hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400
                    dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                    ">
                      {upcomingContests.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                          No upcoming contests.
                        </div>
                      ) : (
                        upcomingContests.slice(0, 15).map((contest, index) => {
                          const cfg = getPlatformConfig(contest.platform);
                          const startTime = new Date(contest.startTime);

                          return (
                            <div
                              key={index}
                              className="p-3.5 hover:bg-white/40 dark:hover:bg-zinc-900/20 transition flex items-center justify-between gap-3"
                            >
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.textColor}`}>
                                  {cfg.name}
                                </span>
                                <h5 className="font-semibold text-xs text-gray-400 dark:text-zinc-250 truncate leading-snug">
                                  {contest.title}
                                </h5>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-450 font-medium">
                                  {startTime.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              
                              <a
                                href={contest.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition shrink-0"
                                title="Go to Contest Website"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                </div>

              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
