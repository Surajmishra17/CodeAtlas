import { cache } from "react";

import { redis, CACHE_TTL } from "@/app/lib/redis";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { fetchAtCoderUserInfo } from "@/app/lib/services/atcoder";
import { fetchCodeChefUserInfo } from "@/app/lib/services/codechef";
import { fetchCodeforcesUserInfo } from "@/app/lib/services/codeforces";
import { fetchGFGUserInfo } from "@/app/lib/services/gfg";
import { fetchGitHubUserInfo } from "@/app/lib/services/github";
import { fetchInterviewBitUserInfo } from "@/app/lib/services/interviewbit";
import { fetchLeetCodeUserInfo } from "@/app/lib/services/leetcode";

type CodingStats =
  | Awaited<ReturnType<typeof fetchLeetCodeUserInfo>>
  | Awaited<ReturnType<typeof fetchCodeChefUserInfo>>
  | Awaited<ReturnType<typeof fetchCodeforcesUserInfo>>
  | Awaited<ReturnType<typeof fetchAtCoderUserInfo>>
  | Awaited<ReturnType<typeof fetchGFGUserInfo>>
  | Awaited<ReturnType<typeof fetchInterviewBitUserInfo>>;

type GitHubStats = Awaited<ReturnType<typeof fetchGitHubUserInfo>>;

type HandleRow = {
  platform_name: string;
  handle: string;
};

export type PublicUserProfile = {
  id: string;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  college?: string | null;
  about?: string | null;
};

export type AggregatedUserStats = {
  coding: CodingStats[];
  github: GitHubStats | null;
  totalSolved: number;
  profile?: PublicUserProfile | null;
};

function normalizeCachedStats(cachedData: unknown): AggregatedUserStats | null {
  if (!cachedData) return null;
  if (typeof cachedData === "string") {
    try {
      return JSON.parse(cachedData) as AggregatedUserStats;
    } catch {
      return null;
    }
  }
  return cachedData as AggregatedUserStats;
}

async function fetchHandlesForUser(userId: string): Promise<HandleRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: handles, error } = await supabaseAdmin
    .from("platform_handles")
    .select("platform_name, handle")
    .eq("user_id", userId);

  if (error) throw error;
  return handles ?? [];
}

export const getUserProfileByUserId = cache(async (userId: string): Promise<PublicUserProfile | null> => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, email, first_name, last_name, college, about")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
});

export const getUserProfileByUsername = cache(async (username: string): Promise<PublicUserProfile | null> => {
  const normalizedUsername = decodeURIComponent(username).trim();
  if (!normalizedUsername) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, email, first_name, last_name, college, about")
    .eq("username", normalizedUsername)
    .single();

  if (error) return null;
  return data;
});

export async function getAggregatedUserStats(
  userId: string,
  options: { includeProfile?: boolean; cachePrefix?: "user" | "public" } = {},
): Promise<{ data: AggregatedUserStats; isCached: boolean }> {
  const cachePrefix = options.cachePrefix ?? "user";
  const cacheKey = `${cachePrefix}:stats:${userId}`;

  try {
    const cachedData = normalizeCachedStats(await redis.get(cacheKey));
    if (cachedData) {
      const profile = options.includeProfile && !cachedData.profile ? await getUserProfileByUserId(userId) : cachedData.profile;
      return {
        data: {
          ...cachedData,
          profile: options.includeProfile ? profile ?? null : cachedData.profile,
        },
        isCached: true,
      };
    }
  } catch (cacheErr) {
    console.error("Redis Read Error:", cacheErr);
  }

  const handles = await fetchHandlesForUser(userId);
  const profile = options.includeProfile ? await getUserProfileByUserId(userId) : null;

  if (handles.length === 0) {
    return {
      data: { coding: [], github: null, totalSolved: 0, profile },
      isCached: false,
    };
  }

  const fetchPromises = handles.map(async (platform) => {
    const { platform_name, handle } = platform;

    try {
      if (platform_name === "leetcode") {
        const data = await fetchLeetCodeUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "codeforces") {
        const data = await fetchCodeforcesUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "codechef") {
        const data = await fetchCodeChefUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "atcoder") {
        const data = await fetchAtCoderUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "gfg") {
        const data = await fetchGFGUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "interviewbit") {
        const data = await fetchInterviewBitUserInfo(handle);
        return { type: "coding", data };
      }
      if (platform_name === "github") {
        const data = await fetchGitHubUserInfo(handle);
        return { type: "github", data };
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch stats for ${platform_name}:`, error);
      return {
        type: "coding",
        data: {
          success: false,
          platform: platform_name,
          error: "Data temporarily unavailable",
        },
      };
    }
  });

  const results = await Promise.all(fetchPromises);
  const codingStats: CodingStats[] = [];
  let githubStats: GitHubStats | null = null;
  let totalSolved = 0;

  for (const item of results) {
    if (!item) continue;

    if (item.type === "github" && item.data?.success) {
      githubStats = item.data as GitHubStats;
    } else if (item.type === "coding") {
      const codingData = item.data as CodingStats;
      codingStats.push(codingData);

      if (codingData.success && "totalSolved" in codingData) {
        totalSolved += codingData.totalSolved || 0;
      }
    }
  }

  const aggregatedData = {
    coding: codingStats,
    github: githubStats,
    totalSolved,
    profile,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(aggregatedData), {
      ex: CACHE_TTL.USER_STATS,
    });
  } catch (cacheErr) {
    console.error("Redis Write Error:", cacheErr);
  }

  return { data: aggregatedData, isCached: false };
}
