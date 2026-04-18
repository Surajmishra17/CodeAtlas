"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  BookOpenText,
  CalendarDays,
  Clock3,
  FolderGit2,
  GitCompareArrows,
  Layers,
  Loader2,
  LogOut,
  Sparkles,
  UserRoundCog,
} from "lucide-react";

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

type TopicCard = {
  platform: string;
  topic: string;
  count: number;
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

function buildHeatmapWeeks(activityByDay: Map<string, number>, totalDays = 140) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (totalDays - 1));

  const flat: Array<{ date: string; submissions: number }> = [];
  for (let i = 0; i < totalDays; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
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

  const dsaTopics = useMemo<TopicCard[]>(() => {
    const rows: TopicCard[] = [];
    for (const platform of codingStats) {
      if (!["leetcode", "gfg"].includes(platform.platform)) continue;
      rows.push(
        {
          platform: formatPlatformName(platform.platform),
          topic: "Easy",
          count: platform.easySolved ?? 0,
        },
        {
          platform: formatPlatformName(platform.platform),
          topic: "Medium",
          count: platform.mediumSolved ?? 0,
        },
        {
          platform: formatPlatformName(platform.platform),
          topic: "Hard",
          count: platform.hardSolved ?? 0,
        },
      );
    }
    return rows.filter((row) => row.count > 0);
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

  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(activityByDay, 140), [activityByDay]);

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

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black font-sans p-4 md:p-6">
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[380px] opacity-35 dark:opacity-20">
          <div className="absolute -top-[120px] -left-[10%] w-[120%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 via-transparent to-transparent dark:from-zinc-800" />
        </div>
        <div className="mx-auto flex max-w-[1600px] gap-4 md:gap-6">
          <aside className="hidden lg:flex lg:w-[280px] shrink-0">
            <Card className="w-full flex flex-col bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl text-black dark:text-white">CodeAtlas</CardTitle>
                <CardDescription className="text-zinc-600 dark:text-zinc-400">
                  Unified coding analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="h-28 overflow-hidden rounded-xl border bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80')",
                  }}
                  aria-label="Coding workspace background"
                />
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
                  onClick={() => router.push("/dashboard/links")}
                >
                  <UserRoundCog className="h-4 w-4" />
                  Manage Coding Links
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
                  onClick={() => router.push("/")}
                >
                  <Layers className="h-4 w-4" />
                  Back To Home
                </Button>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </aside>

          <main className="flex-1 space-y-4 md:space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black dark:text-white">
                  Developer Performance Dashboard
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                  Cross-platform tracking for solved questions, ratings, and consistency.
                </p>
              </CardContent>
            </Card>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Total Questions</CardTitle>
                  <BookOpenText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-black dark:text-white">{totalQuestions.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Aggregated solved count across coding platforms
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Total Active Unique Days</CardTitle>
                  <CalendarDays className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-black dark:text-white">{totalActiveDays.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Days with at least one submission
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">GitHub Repositories</CardTitle>
                  <FolderGit2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-black dark:text-white">{(githubStats?.publicRepos ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Public repos for {githubStats?.handle ?? "your account"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Last Active</CardTitle>
                  <Clock3 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white">
                    <span
                      className={`h-3 w-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`}
                    />
                    {lastActiveDate ? formatDatePretty(lastActiveDate) : "No activity"}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {isActive ? "Active in last 48 hours" : "Inactive recently"}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2 bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-black dark:text-white">
                      <BarChart3 className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
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
                              ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                              : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
                          }
                          onClick={() => setRatingPlatform(key)}
                        >
                          {formatPlatformName(key)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <CardDescription className="text-zinc-600 dark:text-zinc-400">
                    Toggle between platforms to compare rating progress where history is available.
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
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
                          <XAxis dataKey="label" minTickGap={20} />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="rating"
                            name={`${formatPlatformName(ratingPlatform)} Rating`}
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-black dark:text-white">
                    <Sparkles className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                    Topic Insights
                  </CardTitle>
                  <CardDescription className="text-zinc-600 dark:text-zinc-400">
                    Toggle between DSA difficulty split and competitive platform metrics.
                  </CardDescription>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={topicMode === "dsa" ? "default" : "outline"}
                      className={
                        topicMode === "dsa"
                          ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
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
                          ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
                      }
                      onClick={() => setTopicMode("competitive")}
                    >
                      Competitive
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[330px] pr-3">
                    <div className="space-y-3">
                      {topicMode === "dsa" ? (
                        dsaTopics.length === 0 ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            No DSA topic split data found yet for LeetCode/GFG.
                          </p>
                        ) : (
                          dsaTopics.map((item) => (
                            <div
                              key={`${item.platform}-${item.topic}`}
                              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-black dark:text-white">{item.platform}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.topic}</p>
                              </div>
                              <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" variant="secondary">{item.count}</Badge>
                            </div>
                          ))
                        )
                      ) : competitiveInsights.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Competitive topic-wise breakdown is not available from current APIs.
                        </p>
                      ) : (
                        competitiveInsights.map((item) => (
                          <div key={item.platform} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-black dark:text-white">{item.platform}</p>
                              <Badge className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200" variant="outline">{item.rankLabel}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                              <span>Current: {item.currentRating ?? "N/A"}</span>
                              <span>Max: {item.maxRating ?? "N/A"}</span>
                              <span>Solved: {item.totalSolved}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1">
              <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-black dark:text-white">
                    <GitCompareArrows className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                    Submission Heatmap
                  </CardTitle>
                  <CardDescription className="text-zinc-600 dark:text-zinc-400">
                    Consolidated daily submissions from connected platforms (last ~20 weeks).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="min-w-[760px] pb-2">
                      <div className="flex gap-1">
                        {heatmapWeeks.map((week, weekIndex) => (
                          <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                            {week.map((day) => (
                              <Tooltip key={day.date}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-3.5 w-3.5 rounded-[2px] ${getHeatColorLevel(day.submissions)}`}
                                  />
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
                  <Separator className="my-4" />
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Less</span>
                    <div className="h-3 w-3 rounded-[2px] bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-3 rounded-[2px] bg-green-200 dark:bg-green-900" />
                    <div className="h-3 w-3 rounded-[2px] bg-green-400 dark:bg-green-700" />
                    <div className="h-3 w-3 rounded-[2px] bg-green-500 dark:bg-green-500" />
                    <span>More</span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};
