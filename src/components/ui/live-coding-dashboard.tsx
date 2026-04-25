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
  Layers,
  Loader2,
  LogOut,
  Search,
  Share2,
  TrendingUp,
  UserRoundCog,
  Code,
} from "lucide-react";

import { FaGithub } from "react-icons/fa";

import { createClient } from "@/app/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

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
  activity?: ActivityPoint[];
  contestHistory?: ContestHistoryPoint[];
  history?: ContestHistoryPoint[];
};

type GitHubStats = {
  success: boolean;
  handle?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  profileUrl?: string;
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

function buildHeatmapWeeksByRange(
  activityByDay: Map<string, number>,
  start: Date,
  end: Date,
) {
  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  end.setHours(0, 0, 0, 0);
  normalizedEnd.setHours(0, 0, 0, 0);

  const flat: Array<{ date: string; submissions: number }> = [];
  const dayCount =
    Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  for (let i = 0; i < dayCount; i += 1) {
    const day = new Date(normalizedStart);
    day.setDate(normalizedStart.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    flat.push({ date: key, submissions: activityByDay.get(key) ?? 0 });
  }

  const weeks: Array<Array<{ date: string; submissions: number }>> = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}

function getHeatColorLevel(submissions: number): string {
  if (submissions <= 0) return "bg-zinc-200 dark:bg-zinc-800";
  if (submissions <= 2) return "bg-green-200 dark:bg-green-900";
  if (submissions <= 5) return "bg-green-400 dark:bg-green-700";
  return "bg-green-500 dark:bg-green-500";
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
      const total = easy + medium + hard;
      if (total <= 0) continue;
      rows.push({
        platform: formatPlatformName(platform.platform),
        easy,
        medium,
        hard,
        total,
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

  const heatmapWeeks = useMemo(
    () => buildHeatmapWeeksByRange(activityByDay, heatmapRange.start, heatmapRange.end),
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

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black p-4 md:p-8 font-sans selection:bg-zinc-300 dark:selection:bg-zinc-700">
        <StarBackground />
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[420px] opacity-40 dark:opacity-20">
          <div className="absolute -top-[100px] -left-[10%] w-[120%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 via-transparent to-transparent dark:from-zinc-800" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1450px] overflow-hidden rounded-[26px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
          <aside className="hidden w-[270px] shrink-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/35 dark:bg-zinc-950/30 lg:flex lg:flex-col">
            <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-5 py-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-black dark:text-white">CodeAtlas</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Unified coding analytics</p>
                </div>
              </div>
            </div>

            <div className="space-y-7 px-4 py-6 text-[15px]">
              <div className="space-y-2">
                <button className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 px-3 py-2.5 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                  onClick={() => router.push("/dashboard/links")}
                >
                  <UserRoundCog className="h-4 w-4" />
                  Manage Links
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-600 dark:text-zinc-400 transition hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                  onClick={() => router.push("/")}
                >
                  <Home className="h-4 w-4" />
                  Back To Home
                </button>
              </div>
              <Separator className="bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-2">
                <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-500 dark:text-zinc-400">
                  <FaGithub className="h-4 w-4" />
                  Github
                </div>
                <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-500 dark:text-zinc-400">
                  <BookOpenText className="h-4 w-4" />
                  Documentation
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80 p-4">
              <Button
                className="w-full justify-start gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
                <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-white">Dashboard</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
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
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-4 py-5 md:px-6 md:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{relativeUpdateLabel}</span>
                  
                </div>
              </div>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                            onClick={() => setHeatmapPage((prev) => Math.max(0, prev - 1))}
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
                      <div className="min-w-[980px] pb-2">
                        <div className="flex gap-1">
                          {heatmapWeeks.map((week, weekIndex) => (
                            <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                              {week.map((day) => (
                                <Tooltip key={day.date}>
                                  <TooltipTrigger asChild>
                                    <div className={`h-3.5 w-3.5 rounded-full ${getHeatColorLevel(day.submissions)}`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {formatDatePretty(day.date)}: {day.submissions} submissions
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
                    <ScrollArea className="h-[280px] pr-3">
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
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};
