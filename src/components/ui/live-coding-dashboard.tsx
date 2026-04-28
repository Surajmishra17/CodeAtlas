"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StarBackground from "@/components/StarBackground";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart3,
  Bell,
  BookOpenText,
  CalendarDays,
  Clock3,
  FolderGit2,
  GitCompareArrows,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Search,
  Share2,
  TrendingUp,
  UserRoundCog,
  X,
  Code,
  Building2,
  ExternalLink,
  GitFork,
  Link as LinkIcon,
  MapPin,
  Star,
  Users,
} from "lucide-react";

import { FaGithub } from "react-icons/fa";

import { createClient } from "@/app/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import * as htmlToImage from "html-to-image";

type ActivityPoint = {
  date: string;
  submissions: number;
};

type ContestHistoryPoint = {
  contestName?: string;
  rating?: number;
  newRating?: number;
  date?: string;
  ratingUpdateTimeSeconds?: number;
};

type CodingPlatformStats = {
  success: boolean;
  platform: string;
  handle?: string;
  totalSolved?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  rating?: number;
  maxRating?: number;
  contestRating?: number;
  rank?: string | number;
  stars?: string;
  score?: number;
  monthlyScore?: number;
  institution?: string | null;
  articlesPublished?: number;
  potdCurrentStreak?: number;
  potdLongestStreak?: number;
  potdSolved?: number;
  activity?: ActivityPoint[];
  contestHistory?: ContestHistoryPoint[];
  history?: ContestHistoryPoint[];
};

type GitHubStats = {
  success: boolean;
  handle?: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  publicRepos?: number;
  publicGists?: number;
  followers?: number;
  following?: number;
  avatar?: string;
  profileUrl?: string;
  createdAt?: string;
  totalStars?: number;
  totalForks?: number;
  topLanguages?: Array<{
    language: string;
    count: number;
  }>;
  recentRepos?: Array<{
    name: string;
    description?: string | null;
    url: string;
    language?: string | null;
    stars: number;
    forks: number;
    updatedAt?: string;
  }>;
  contributionCalendar?: {
    totalContributions: number;
    weeks: Array<{
      contributionDays: Array<{
        date: string;
        contributionCount: number;
        color?: string;
      }>;
    }>;
  } | null;
};

type AggregatedStatsApi = {
  success: boolean;
  message?: string;
  data?: {
    coding: CodingPlatformStats[];
    github: GitHubStats | null;
    totalSolved: number;
  };
};

type RatingSeries = {
  label: string;
  rating: number;
};

type DsaInsight = {
  platform: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
  hasDifficultySplit: boolean;
};

type CompetitiveInsight = {
  platform: string;
  currentRating: number | null;
  maxRating: number | null;
  rankLabel: string;
  totalSolved: number;
};




const platformLabels: Record<string, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  atcoder: "AtCoder",
  gfg: "GFG",
  interviewbit: "InterviewBit",
};

function formatPlatformName(platform: string): string {
  return platformLabels[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

function getPlatformProfileUrl(platform: string, handle?: string): string | null {
  if (!handle) return null;
  const encodedHandle = encodeURIComponent(handle);

  switch (platform) {
    case "leetcode":
      return `https://leetcode.com/u/${encodedHandle}`;
    case "codeforces":
      return `https://codeforces.com/profile/${encodedHandle}`;
    case "codechef":
      return `https://www.codechef.com/users/${encodedHandle}`;
    case "atcoder":
      return `https://atcoder.jp/users/${encodedHandle}`;
    case "gfg":
      return `https://www.geeksforgeeks.org/profile/${encodedHandle}`;
    case "interviewbit":
      return `https://www.interviewbit.com/profile/${encodedHandle}`;
    case "github":
      return `https://github.com/${encodedHandle}`;
    default:
      return null;
  }
}

function formatDatePretty(dateText: string): string {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeUpdate(dateText: string | null): string {
  if (!dateText) return "No recent update";
  const then = new Date(dateText).getTime();
  const now = Date.now();
  if (!Number.isFinite(then)) return "No recent update";
  const minutes = Math.max(1, Math.floor((now - then) / 60000));
  if (minutes < 60) return `Last update ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last update ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `Last update ${days} days ago`;
}

function formatMonthYear(dateText?: string): string {
  if (!dateText) return "Unknown";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function aggregateActivity(codingStats: CodingPlatformStats[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stat of codingStats) {
    for (const point of stat.activity ?? []) {
      if (!point.date) continue;
      const value = Number.isFinite(point.submissions) ? point.submissions : 0;
      map.set(point.date, (map.get(point.date) ?? 0) + Math.max(value, 0));
    }
  }
  return map;
}

type HeatmapDay = {
  date: string;
  submissions: number;
};

type HeatmapMonth = {
  key: string;
  label: string;
  weeks: Array<Array<HeatmapDay | null>>;
};

function buildHeatmapMonthsByRange(
  activityByDay: Map<string, number>,
  start: Date,
  end: Date,
): HeatmapMonth[] {
  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  const months: HeatmapMonth[] = [];
  const cursor = new Date(normalizedStart.getFullYear(), normalizedStart.getMonth(), 1);

  while (cursor.getTime() <= normalizedEnd.getTime()) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const visibleStart = monthStart.getTime() < normalizedStart.getTime() ? normalizedStart : monthStart;
    const visibleEnd = monthEnd.getTime() > normalizedEnd.getTime() ? normalizedEnd : monthEnd;
    const weeks: Array<Array<HeatmapDay | null>> = [];
    let week: Array<HeatmapDay | null> = [];

    for (let i = 0; i < visibleStart.getDay(); i += 1) {
      week.push(null);
    }

    const day = new Date(visibleStart);
    while (day.getTime() <= visibleEnd.getTime()) {
      const key = day.toISOString().slice(0, 10);
      week.push({ date: key, submissions: activityByDay.get(key) ?? 0 });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }

      day.setDate(day.getDate() + 1);
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString(undefined, { month: "short" }),
      weeks,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getHeatColorLevel(submissions: number): string {
  if (submissions <= 0) return "bg-zinc-200 dark:bg-zinc-800";
  if (submissions <= 2) return "bg-green-200 dark:bg-green-900";
  if (submissions <= 5) return "bg-green-400 dark:bg-green-700";
  return "bg-green-500 dark:bg-green-500";
}

function getGithubHeatColorLevel(contributions: number): string {
  if (contributions <= 0) return "bg-zinc-200 dark:bg-zinc-800";
  if (contributions <= 2) return "bg-emerald-200 dark:bg-emerald-950";
  if (contributions <= 5) return "bg-emerald-400 dark:bg-emerald-800";
  if (contributions <= 10) return "bg-emerald-600 dark:bg-emerald-600";
  return "bg-emerald-700 dark:bg-emerald-500";
}

export const SalesDashboard: React.FC = () => {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AggregatedStatsApi["data"] | null>(null);
  const [ratingPlatform, setRatingPlatform] = useState<string>("leetcode");
  const [topicMode, setTopicMode] = useState<"dsa" | "competitive">("dsa");
  const [heatmapPage, setHeatmapPage] = useState(0);
  const [activeView, setActiveView] = useState<"dashboard" | "github">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showProfileCard, setShowProfileCard] = useState(false);


const handleDownloadCard = async () => {
  const card = document.getElementById("profile-card");
  if (!card) return;

  const dataUrl = await htmlToImage.toPng(card);
  const link = document.createElement("a");
  link.download = "profile-card.png";
  link.href = dataUrl;
  link.click();
};

// const handleNativeShare = async () => {
//   const card = document.getElementById("profile-card");
//   if (!card) return;

//   const blob = await htmlToImage.toBlob(card);

//   if (navigator.canShare && blob) {
//     navigator.share({
//       files: [new File([blob], "profile-card.png", { type: "image/png" })],
//       title: "My Coding Profile",
//     });
//   } else {
//     alert("Sharing not supported on this device.");
//   }
// };

const handleNativeShare = async () => {
  const card = document.getElementById("profile-card");
  if (!card) return;

  const blob = await htmlToImage.toBlob(card);
  
  // Guard clause to ensure blob was successfully created
  if (!blob) {
    console.error("Failed to generate image blob.");
    return;
  }

  const shareData = {
    files: [new File([blob], "profile-card.png", { type: "image/png" })],
    title: "My Coding Profile",
  };

  // 1. Check if the method exists on the navigator object
  // 2. Call the method with the data to see if the browser supports sharing it
  if ('canShare' in navigator && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      // Handle cases where the user cancels the share dialog
      console.error("Error sharing or share cancelled:", error);
    }
  } else {
    alert("Sharing not supported on this device.");
  }
};

  useEffect(() => {
    let alive = true;

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/user/stats", { cache: "no-store" });
        const payload = (await response.json()) as AggregatedStatsApi;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Could not load dashboard stats.");
        }

        if (!alive) return;
        setStats(payload.data ?? null);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadStats();
    return () => {
      alive = false;
    };
  }, []);

  const codingStats = useMemo(
    () => (stats?.coding ?? []).filter((entry) => entry.success),
    [stats],
  );

  const githubStats = stats?.github?.success ? stats.github : null;
  const totalQuestions = stats?.totalSolved ?? 0;
  const profileLinks = useMemo(() => {
    const links = codingStats
      .map((entry) => ({
        platform: entry.platform,
        label: formatPlatformName(entry.platform),
        handle: entry.handle,
        url: getPlatformProfileUrl(entry.platform, entry.handle),
      }))
      .filter((entry): entry is { platform: string; label: string; handle: string; url: string } =>
        Boolean(entry.handle && entry.url),
      );

    if (githubStats?.handle) {
      links.unshift({
        platform: "github",
        label: "GitHub",
        handle: githubStats.handle,
        url: githubStats.profileUrl ?? `https://github.com/${encodeURIComponent(githubStats.handle)}`,
      });
    }

    return links;
  }, [codingStats, githubStats]);

  const gfgStats = useMemo(
    () => codingStats.find((entry) => entry.platform === "gfg") ?? null,
    [codingStats],
  );

  const activityByDay = useMemo(() => aggregateActivity(codingStats), [codingStats]);
  const totalActiveDays = useMemo(
    () => [...activityByDay.values()].filter((count) => count > 0).length,
    [activityByDay],
  );

  const lastActiveDate = useMemo(() => {
    const activeDates = [...activityByDay.entries()]
      .filter(([, count]) => count > 0)
      .map(([date]) => date)
      .sort();
    return activeDates.length ? activeDates[activeDates.length - 1] : null;
  }, [activityByDay]);

  const isActive = useMemo(() => {
    if (!lastActiveDate) return false;
    const now = new Date();
    const last = new Date(lastActiveDate);
    const diff = now.getTime() - last.getTime();
    return diff <= 48 * 60 * 60 * 1000;
  }, [lastActiveDate]);

  const ratingByPlatform = useMemo(() => {
    const map = new Map<string, RatingSeries[]>();

    for (const platform of codingStats) {
      const key = platform.platform;
      const rows: RatingSeries[] = [];

      if (key === "leetcode") {
        const history = platform.contestHistory ?? [];
        for (const point of history) {
          if (typeof point.rating === "number") {
            rows.push({
              label: point.date ? formatDatePretty(point.date) : point.contestName ?? "Contest",
              rating: point.rating,
            });
          }
        }
      } else if (key === "codeforces") {
        const history = platform.history ?? [];
        for (const point of history) {
          const ratingValue = typeof point.newRating === "number" ? point.newRating : null;
          if (ratingValue !== null) {
            const dateText = point.ratingUpdateTimeSeconds
              ? new Date(point.ratingUpdateTimeSeconds * 1000).toISOString()
              : undefined;
            rows.push({
              label: dateText ? formatDatePretty(dateText) : point.contestName ?? "Contest",
              rating: ratingValue,
            });
          }
        }
      }

      if (rows.length === 0) {
        const fallback =
          typeof platform.contestRating === "number"
            ? platform.contestRating
            : typeof platform.rating === "number"
              ? platform.rating
              : null;
        if (fallback !== null && fallback > 0) {
          rows.push({ label: "Current", rating: fallback });
        }
      }

      if (rows.length > 0) {
        map.set(key, rows);
      }
    }

    return map;
  }, [codingStats]);

  useEffect(() => {
    const firstPlatform = ratingByPlatform.keys().next().value as string | undefined;
    if (firstPlatform && !ratingByPlatform.has(ratingPlatform)) {
      setRatingPlatform(firstPlatform);
    }
  }, [ratingByPlatform, ratingPlatform]);

  const dsaInsights = useMemo<DsaInsight[]>(() => {
    const rows: DsaInsight[] = [];
    for (const platform of codingStats) {
      if (!["leetcode", "gfg"].includes(platform.platform)) continue;
      const easy = platform.easySolved ?? 0;
      const medium = platform.mediumSolved ?? 0;
      const hard = platform.hardSolved ?? 0;
      const splitTotal = easy + medium + hard;
      const total = splitTotal > 0 ? splitTotal : platform.totalSolved ?? 0;
      if (total <= 0) continue;
      rows.push({
        platform: formatPlatformName(platform.platform),
        easy,
        medium,
        hard,
        total,
        hasDifficultySplit: splitTotal > 0,
      });
    }
    return rows;
  }, [codingStats]);

  const competitiveInsights = useMemo<CompetitiveInsight[]>(() => {
    const competitivePlatforms = codingStats.filter((entry) =>
      ["codeforces", "codechef", "atcoder"].includes(entry.platform),
    );

    return competitivePlatforms.map((entry) => ({
      platform: formatPlatformName(entry.platform),
      currentRating:
        typeof entry.rating === "number"
          ? entry.rating
          : typeof entry.contestRating === "number"
            ? entry.contestRating
            : null,
      maxRating: typeof entry.maxRating === "number" ? entry.maxRating : null,
      rankLabel: String(entry.rank ?? entry.stars ?? "N/A"),
      totalSolved: entry.totalSolved ?? 0,
    }));
  }, [codingStats]);

  const earliestActivityDate = useMemo(() => {
    const dates = [...activityByDay.keys()].sort();
    return dates.length ? dates[0] : null;
  }, [activityByDay]);

  const heatmapRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(today.getDate() - heatmapPage * 182);
    const start = new Date(end);
    start.setDate(end.getDate() - 181);
    return { start, end };
  }, [heatmapPage]);

  const heatmapMonths = useMemo(
    () => buildHeatmapMonthsByRange(activityByDay, heatmapRange.start, heatmapRange.end),
    [activityByDay, heatmapRange],
  );

  const canShowOlderHeatmap = useMemo(() => {
    if (!earliestActivityDate) return false;
    const earliest = new Date(earliestActivityDate);
    earliest.setHours(0, 0, 0, 0);
    return earliest.getTime() < heatmapRange.start.getTime();
  }, [earliestActivityDate, heatmapRange.start]);

  const heatmapRangeLabel = useMemo(() => {
    const from = heatmapRange.start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const to = heatmapRange.end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${from} - ${to}`;
  }, [heatmapRange]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-black dark:text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-black dark:text-white flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-white/80 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Could not load dashboard</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Button
              className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const relativeUpdateLabel = formatRelativeUpdate(lastActiveDate);
  const githubProfileUrl = githubStats?.profileUrl ?? (githubStats?.handle ? `https://github.com/${githubStats.handle}` : null);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black p-4 md:p-8 font-sans selection:bg-zinc-300 dark:selection:bg-zinc-700">
        <StarBackground />
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${activeView === "dashboard"
                      ? "border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 font-semibold text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  onClick={() => {
                    setActiveView("dashboard");
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${activeView === "github"
                      ? "border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 font-semibold text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  onClick={() => {
                    setActiveView("github");
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
                className="w-full justify-start gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-red-500 dark:text-black dark:hover:bg-red-200 active:scale-97"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 bg-white/15 dark:bg-zinc-950/10">
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
                    {activeView === "github" ? "GitHub Dashboard" : "Dashboard"}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* <Button
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <div className="flex h-10 min-w-[220px] items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 px-3">
                    <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search something"
                      className="w-full bg-transparent text-sm text-zinc-700 dark:text-zinc-200 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    />
                  </div>*/}
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setShowProfileCard(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>

                  
                </div>
              </div>
            </div>

            {activeView === "github" ? (
              <div className="space-y-5 px-4 py-5 md:px-6 md:py-6">
                {!githubStats ? (
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                        <FaGithub className="h-5 w-5" />
                        GitHub profile is not connected
                      </CardTitle>
                      <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Add your GitHub username in Manage Links to show profile, repositories, followers, languages, stars, and forks here.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        className="gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        onClick={() => router.push("/dashboard/links")}
                      >
                        <UserRoundCog className="h-4 w-4" />
                        Manage Links
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <>
                    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-5">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-5 sm:flex-row xl:flex-col">
                            <div
                              className="h-28 w-28 shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-cover bg-center shadow-sm"
                              style={{ backgroundImage: githubStats.avatar ? `url(${githubStats.avatar})` : undefined }}
                            />
                            <div className="min-w-0 flex-1 space-y-4">
                              <div>
                                <h2 className="truncate text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                  {githubStats.name || githubStats.handle}
                                </h2>
                                <p className="text-base text-zinc-500 dark:text-zinc-400">@{githubStats.handle}</p>
                              </div>
                              {githubStats.bio ? (
                                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{githubStats.bio}</p>
                              ) : null}
                              <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {githubStats.company ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span>{githubStats.company}</span>
                                  </div>
                                ) : null}
                                {githubStats.location ? (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{githubStats.location}</span>
                                  </div>
                                ) : null}
                                {githubStats.blog ? (
                                  <div className="flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" />
                                    <a className="truncate hover:text-zinc-900 dark:hover:text-zinc-100" href={githubStats.blog.startsWith("http") ? githubStats.blog : `https://${githubStats.blog}`} target="_blank" rel="noreferrer">
                                      {githubStats.blog}
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {githubProfileUrl ? (
                                  <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onClick={() => window.open(githubProfileUrl, "_blank", "noopener,noreferrer")}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Profile
                                  </Button>
                                ) : null}
                                <Badge variant="secondary" className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                                  Joined {formatMonthYear(githubStats.createdAt)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-3 xl:col-span-7">
                        {[
                          { label: "Repositories", value: githubStats.publicRepos ?? 0, icon: FolderGit2 },
                          { label: "Followers", value: githubStats.followers ?? 0, icon: Users },
                          { label: "Following", value: githubStats.following ?? 0, icon: UserRoundCog },
                          { label: "Stars", value: githubStats.totalStars ?? 0, icon: Star },
                          { label: "Forks", value: githubStats.totalForks ?? 0, icon: GitFork },
                          { label: "Gists", value: githubStats.publicGists ?? 0, icon: Code },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <Card key={item.label} className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">{item.label}</CardTitle>
                                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              </CardHeader>
                              <CardContent>
                                <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{item.value.toLocaleString()}</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </section>

                    <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                              <GitCompareArrows className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                              GitHub Contribution Heatmap
                            </CardTitle>
                            <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                              {githubStats.contributionCalendar
                                ? `${githubStats.contributionCalendar.totalContributions.toLocaleString()} contributions in the last year.`
                                : "Contribution calendar needs a server-side GitHub token."}
                            </CardDescription>
                          </div>
                          {githubStats.contributionCalendar ? (
                            <Badge variant="secondary" className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                              Last 12 months
                            </Badge>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {githubStats.contributionCalendar ? (
                          <>
                            <ScrollArea className="w-full">
                              <div className="min-w-[760px] pb-2">
                                <div className="flex gap-1">
                                  {githubStats.contributionCalendar.weeks.map((week, weekIndex) => (
                                    <div key={`github-week-${weekIndex}`} className="flex flex-col gap-1">
                                      {week.contributionDays.map((day) => (
                                        <Tooltip key={day.date}>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={`h-3.5 w-3.5 rounded-sm ${getGithubHeatColorLevel(day.contributionCount)}`}
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs">
                                              {formatDatePretty(day.date)}: {day.contributionCount} contributions
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </ScrollArea>
                            <Separator className="my-4 bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                              <span>Less</span>
                              <div className="h-3 w-3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                              <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-950" />
                              <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-800" />
                              <div className="h-3 w-3 rounded-sm bg-emerald-600" />
                              <div className="h-3 w-3 rounded-sm bg-emerald-700 dark:bg-emerald-500" />
                              <span>More</span>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Add `GITHUB_TOKEN` to the server environment to load the real GitHub contribution calendar.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-8">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                            <FolderGit2 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                            Recent Repositories
                          </CardTitle>
                          <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                            Public repositories sorted by latest update.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(githubStats.recentRepos ?? []).length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No public repositories found.</p>
                          ) : (
                            githubStats.recentRepos?.map((repo) => (
                              <a
                                key={repo.name}
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 px-4 py-3 transition hover:bg-white dark:hover:bg-zinc-900"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{repo.name}</p>
                                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{repo.stars}</span>
                                    <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{repo.forks}</span>
                                  </div>
                                </div>
                                {repo.description ? (
                                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{repo.description}</p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                  {repo.language ? <span>{repo.language}</span> : null}
                                  <span>Updated {formatDatePretty(repo.updatedAt ?? "")}</span>
                                </div>
                              </a>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-4">
                        <CardHeader>
                          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Top Languages</CardTitle>
                          <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                            Based on public repository primary language.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(githubStats.topLanguages ?? []).length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No language data available.</p>
                          ) : (
                            githubStats.topLanguages?.map((item) => {
                              const maxCount = Math.max(...(githubStats.topLanguages ?? []).map((entry) => entry.count), 1);
                              return (
                                <div key={item.language} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.language}</span>
                                    <span className="text-zinc-500 dark:text-zinc-400">{item.count}</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    </section>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5 px-4 py-5 md:px-6 md:py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{relativeUpdateLabel}</span>

                  </div>
                </div>

                <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">Total Questions</CardTitle>
                      <BookOpenText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{totalQuestions.toLocaleString()}</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Aggregated solved count</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">GFG Score</CardTitle>
                      <Code className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {(gfgStats?.score ?? 0).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {gfgStats ? `${(gfgStats.totalSolved ?? 0).toLocaleString()} solved on GFG` : "Connect GFG handle"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">Active Days</CardTitle>
                      <CalendarDays className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{totalActiveDays.toLocaleString()}</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Days with submissions</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">GitHub Repos</CardTitle>
                      <FolderGit2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {(githubStats?.publicRepos ?? 0).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{githubStats?.handle ?? "your account"}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-200">Last Active</CardTitle>
                      <Clock3 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        {lastActiveDate ? formatDatePretty(lastActiveDate) : "No activity"}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-8">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                          <BarChart3 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                          Platform Rating Trend
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {[...ratingByPlatform.keys()].map((key) => (
                            <Button
                              key={key}
                              size="sm"
                              variant={ratingPlatform === key ? "default" : "outline"}
                              className={
                                ratingPlatform === key
                                  ? "rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                                  : "rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }
                              onClick={() => setRatingPlatform(key)}
                            >
                              {formatPlatformName(key)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                        Compare rating movement across platforms with available contest history.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ratingByPlatform.size === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No rating history available yet. Add handles and participate in rated contests.
                        </p>
                      ) : (
                        <div className="h-[340px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ratingByPlatform.get(ratingPlatform) ?? []}>
                              <CartesianGrid stroke="#d4d4d8" strokeDasharray="3 3" />
                              <XAxis dataKey="label" minTickGap={20} stroke="#71717a" />
                              <YAxis stroke="#71717a" />
                              <RechartsTooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="rating"
                                name={`${formatPlatformName(ratingPlatform)} Rating`}
                                stroke="#1d4ed8"
                                strokeWidth={2.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        <TrendingUp className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                        Performance
                      </CardTitle>
                      <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                        Competitive profile snapshot from connected handles.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {competitiveInsights.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No competitive data available yet.</p>
                      ) : (
                        competitiveInsights.map((item) => {
                          const cappedRating = Math.min(Math.max(item.currentRating ?? 0, 0), 4000);
                          const progress = (cappedRating / 4000) * 100;
                          return (
                            <div key={item.platform} className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{item.platform}</p>
                                <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200">
                                  {item.rankLabel}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Current {item.currentRating ?? "N/A"}</span>
                                <span>Max {item.maxRating ?? "N/A"}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-7">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                            <GitCompareArrows className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                            Submission Heatmap
                          </CardTitle>
                          <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                            6-month submissions window ({heatmapRangeLabel}).
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {heatmapPage > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              onClick={() => setHeatmapPage(0)}
                            >
                              Newer
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canShowOlderHeatmap}
                            className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => setHeatmapPage((prev) => prev + 1)}
                          >
                            Older
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="w-full">
                        <div className="min-w-[680px] pb-3">
                          <div className="flex items-end gap-4">
                            {heatmapMonths.map((month) => (
                              <div key={month.key} className="space-y-2">
                                <div className="flex gap-1">
                                  {month.weeks.map((week, weekIndex) => (
                                    <div key={`${month.key}-week-${weekIndex}`} className="flex flex-col gap-1">
                                      {week.map((day, dayIndex) =>
                                        day ? (
                                          <Tooltip key={day.date}>
                                            <TooltipTrigger asChild>
                                              <div className={`h-3.5 w-3.5 rounded-[3px] ${getHeatColorLevel(day.submissions)}`} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">
                                                {formatDatePretty(day.date)}: {day.submissions} submissions
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <div
                                            key={`${month.key}-empty-${weekIndex}-${dayIndex}`}
                                            className="h-3.5 w-3.5 rounded-[3px] opacity-0"
                                          />
                                        ),
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                  {month.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                      <Separator className="my-4 bg-zinc-200 dark:bg-zinc-800" />
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Less</span>
                        <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-3 rounded-full bg-green-200" />
                        <div className="h-3 w-3 rounded-full bg-green-400" />
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span>More</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm xl:col-span-5">
                    <CardHeader className="space-y-3">
                      <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Profile Insights</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={topicMode === "dsa" ? "default" : "outline"}
                          className={
                            topicMode === "dsa"
                              ? "rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                              : "rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }
                          onClick={() => setTopicMode("dsa")}
                        >
                          DSA
                        </Button>
                        <Button
                          size="sm"
                          variant={topicMode === "competitive" ? "default" : "outline"}
                          className={
                            topicMode === "competitive"
                              ? "rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                              : "rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }
                          onClick={() => setTopicMode("competitive")}
                        >
                          Competitive
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-[250px] pr-3">
                        <div className="space-y-2">
                          {topicMode === "dsa" ? (
                            dsaInsights.length === 0 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">No DSA topic split data found yet for LeetCode/GFG.</p>
                            ) : (
                              dsaInsights.map((item) => {
                                const easyDeg = (item.easy / item.total) * 360;
                                const mediumDeg = (item.medium / item.total) * 360;
                                const easyEnd = easyDeg;
                                const mediumEnd = easyDeg + mediumDeg;

                                return (
                                  <div key={item.platform} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 px-3 py-3">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.platform}</p>
                                      <Badge variant="secondary" className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                                        {item.total} solved
                                      </Badge>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                      {item.hasDifficultySplit ? (
                                        <div
                                          className="relative h-16 w-16 rounded-full"
                                          style={{
                                            background: `conic-gradient(#22c55e 0deg ${easyEnd}deg, #f59e0b ${easyEnd}deg ${mediumEnd}deg, #ef4444 ${mediumEnd}deg 360deg)`,
                                          }}
                                        >
                                          <div className="absolute inset-[9px] grid place-items-center rounded-full bg-white dark:bg-zinc-900 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">
                                            DSA
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="grid h-16 w-16 place-items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                          Total
                                        </div>
                                      )}
                                      {item.hasDifficultySplit ? (
                                        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                                          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-1.5">
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Easy</p>
                                            <p className="text-sm font-semibold text-emerald-600">{item.easy}</p>
                                          </div>
                                          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-1.5">
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Medium</p>
                                            <p className="text-sm font-semibold text-amber-600">{item.medium}</p>
                                          </div>
                                          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-1.5">
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Hard</p>
                                            <p className="text-sm font-semibold text-rose-600">{item.hard}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
                                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Difficulty split unavailable</p>
                                          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{item.total.toLocaleString()} solved</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )
                          ) : competitiveInsights.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Competitive topic-wise breakdown is not available from current APIs.</p>
                          ) : (
                            competitiveInsights.map((item) => (
                              <div key={item.platform} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-200">
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.platform}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Solved {item.totalSolved} | Rank {item.rankLabel}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

            {showProfileCard && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                
                <div
                  id="profile-card"
                  className="relative w-[350px] rounded-2xl bg-[#111] text-white p-6 h-full overflow-auto shadow-2xl border border-zinc-700"
                >
                  {/* Close Button */}
                  <button
                    className="absolute top-3 right-3 bg-white/10 p-2 rounded-full hover:bg-white/20"
                    onClick={() => setShowProfileCard(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Avatar */}
                  <div className="flex justify-center">
                    <div className="h-25 w-25 rounded-full overflow-hidden border-4 border-amber-400">
                      <img
                        src={githubStats?.avatar || "/placeholder.png"}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Name & Username */}
                  <div className="mt-4 text-center">
                    <p className="text-xl font-semibold">{githubStats?.name || "User"}</p>
                    <p className="text-zinc-400">@{githubStats?.handle}</p>
                  </div>

                  {/* Stats section */}
                  <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white/10 rounded-xl py-4">
                      <p className="text-sm text-zinc-400">Questions Solved</p>
                      <p className="text-3xl font-bold">{totalQuestions}</p>
                    </div>

                    <div className="bg-white/10 rounded-xl py-4">
                      <p className="text-sm text-zinc-400">Active Days</p>
                      <p className="text-3xl font-bold">{totalActiveDays}</p>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="mt-4 bg-white/10 rounded-xl p-2 text-center text-sm">
                    <p className="text-zinc-400 mb-3">Profile links</p>
                    <div className="space-y-2 flex flex-wrap text-left">
                      {profileLinks.length > 0 ? (
                        profileLinks.map((link) => (
                          <a
                            key={`${link.platform}-${link.handle}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-1/2 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-zinc-100 transition hover:border-white/25 hover:bg-white/10"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{link.label}</span>
                              <span className="block truncate text-xs text-zinc-400">@{link.handle}</span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                          </a>
                        ))
                      ) : (
                        <p className="text-center text-xs text-zinc-500">
                          Add platform handles to show profile links.
                        </p>
                      )}
                    </div>
                    <div className="hidden">
                      {codingStats.map((p) => (
                        <span key={p.platform} title={formatPlatformName(p.platform)}>
                          {p.platform === "leetcode" && "🟧"}
                          {p.platform === "codeforces" && "🔵"}
                          {p.platform === "gfg" && "🟢"}
                          {p.platform === "codechef" && "⚪"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="secondary"
                      className="bg-white/20 text-white hover:bg-white/30"
                      onClick={handleDownloadCard}
                    >
                      Download
                    </Button>

                    <Button
                      variant="secondary"
                      className="bg-white/20 text-white hover:bg-white/30"
                      onClick={handleNativeShare}
                    >
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            )}


    </TooltipProvider>
  );
};
