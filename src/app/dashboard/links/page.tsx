"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type HandleRecord = {
  platform_name: string;
  handle: string;
};

const platforms = [
  "leetcode",
  "codeforces",
  "codechef",
  "atcoder",
  "gfg",
  "interviewbit",
  "github",
] as const;

type PlatformKey = (typeof platforms)[number];

export default function DashboardLinksPage() {
  const router = useRouter();
  const [handles, setHandles] = useState<Record<PlatformKey, string>>({
    leetcode: "",
    codeforces: "",
    codechef: "",
    atcoder: "",
    gfg: "",
    interviewbit: "",
    github: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<PlatformKey, boolean>>({
    leetcode: false,
    codeforces: false,
    codechef: false,
    atcoder: false,
    gfg: false,
    interviewbit: false,
    github: false,
  });
  const [savedFlag, setSavedFlag] = useState<Record<PlatformKey, boolean>>({
    leetcode: false,
    codeforces: false,
    codechef: false,
    atcoder: false,
    gfg: false,
    interviewbit: false,
    github: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchHandles = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/user/handle", { cache: "no-store" });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch saved handles.");
        }

        if (!alive) return;
        const nextHandles: Record<PlatformKey, string> = {
          leetcode: "",
          codeforces: "",
          codechef: "",
          atcoder: "",
          gfg: "",
          interviewbit: "",
          github: "",
        };

        const rows = (json.data ?? []) as HandleRecord[];
        for (const row of rows) {
          const key = row.platform_name as PlatformKey;
          if (platforms.includes(key)) {
            nextHandles[key] = row.handle ?? "";
          }
        }
        setHandles(nextHandles);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Could not load platform handles.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchHandles();
    return () => {
      alive = false;
    };
  }, []);

  const connectedCount = useMemo(
    () => platforms.filter((key) => handles[key].trim().length > 0).length,
    [handles],
  );

  const saveHandle = async (platform: PlatformKey) => {
    const handleValue = handles[platform].trim();
    if (!handleValue) return;

    setSaving((prev) => ({ ...prev, [platform]: true }));
    setSavedFlag((prev) => ({ ...prev, [platform]: false }));
    setError(null);

    try {
      const response = await fetch("/api/user/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_name: platform,
          handle: handleValue,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Failed to save ${platform} handle.`);
      }

      setSavedFlag((prev) => ({ ...prev, [platform]: true }));
      setTimeout(() => {
        setSavedFlag((prev) => ({ ...prev, [platform]: false }));
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving((prev) => ({ ...prev, [platform]: false }));
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-50 dark:bg-black text-black dark:text-white p-4 md:p-8">
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[360px] opacity-35 dark:opacity-20">
        <div className="absolute -top-[120px] -left-[10%] w-[120%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 via-transparent to-transparent dark:from-zinc-800" />
      </div>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="gap-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Dashboard
          </Button>
          <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" variant="secondary">
            {connectedCount} / {platforms.length} connected
          </Badge>
        </div>

        <Card className="bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Manage Coding Platform Links</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Add or update your handles for LeetCode, Codeforces, CodeChef, AtCoder, GFG, InterviewBit, and GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your saved handles...
              </div>
            ) : (
              platforms.map((platform) => (
                <div key={platform} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/30 p-3 md:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="font-medium capitalize text-black dark:text-white">{platform}</p>
                    {handles[platform].trim() ? (
                      <Badge className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200" variant="outline">Configured</Badge>
                    ) : (
                      <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" variant="secondary">Not Set</Badge>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white flex-1"
                      placeholder={`Enter your ${platform} username`}
                      value={handles[platform]}
                      onChange={(e) =>
                        setHandles((prev) => ({
                          ...prev,
                          [platform]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      onClick={() => saveHandle(platform)}
                      disabled={saving[platform] || !handles[platform].trim()}
                      className="gap-2 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      {saving[platform] ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : savedFlag[platform] ? (
                        <>
                          <Check className="h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
            {error ? (
              <div className="rounded-md border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-400">
                {error}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="text-xs text-zinc-500 dark:text-zinc-400">
            Dashboard metrics update based on these linked handles.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
