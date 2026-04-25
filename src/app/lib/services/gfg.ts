import * as cheerio from "cheerio";

type GFGUserData = {
    name?: string;
    profile_image_url?: string;
    institute_name?: string | null;
    organization_name?: string | null;
    score?: number | string | null;
    monthly_score?: number | string | null;
    total_problems_solved?: number | string | null;
    institute_rank?: number | string | null;
    pod_solved_longest_streak?: number | string | null;
    pod_solved_current_streak?: number | string | null;
    pod_solved_current_streak_incl_timemachine?: number | string | null;
    pod_correct_submissions_count?: number | string | null;
};

type GFGUserDataPayload = {
    data?: GFGUserData | null;
    error?: unknown;
};

type GFGArticleCountPayload = {
    total_articles_published?: number | string | null;
};

function normalizeHandle(handle: string): string {
    const trimmed = handle.trim().replace(/:$/, "");

    try {
        const url = new URL(trimmed);
        const profileIndex = url.pathname.split("/").findIndex((part) => part === "profile");
        if (profileIndex >= 0) {
            return url.pathname.split("/")[profileIndex + 1] ?? trimmed;
        }
    } catch {
        // Not a URL; continue with path-style cleanup.
    }

    return trimmed
        .replace(/^https?:\/\/(www\.)?geeksforgeeks\.org\/profile\//i, "")
        .replace(/^\/?profile\//i, "")
        .replace(/[/?#].*$/, "")
        .replace(/\/$/, "");
}

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return 0;

    const match = value.replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function getMetaContent($: cheerio.CheerioAPI, selector: string): string | null {
    const content = $(selector).attr("content")?.trim();
    return content || null;
}

function extractBalancedObject(text: string, key: string): string | null {
    const keyIndex = text.indexOf(`"${key}":`);
    if (keyIndex < 0) return null;

    const start = text.indexOf("{", keyIndex);
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
        const char = text[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
        } else if (char === "{") {
            depth += 1;
        } else if (char === "}") {
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, index + 1);
            }
        }
    }

    return null;
}

function parseEmbeddedPayload<T>($: cheerio.CheerioAPI, key: string): T | null {
    const scriptText = $("script")
        .map((_, element) => $(element).html() ?? "")
        .get()
        .join("\n")
        .replace(/\\"/g, "\"");

    const objectText = extractBalancedObject(scriptText, key);
    if (!objectText) return null;

    try {
        return JSON.parse(objectText) as T;
    } catch {
        return null;
    }
}

export async function fetchGFGUserInfo(handle: string) {
    try {
        const cleanHandle = normalizeHandle(handle);
        if (!cleanHandle) {
            throw new Error("GeeksforGeeks handle is empty");
        }

        const response = await fetch(`https://www.geeksforgeeks.org/profile/${encodeURIComponent(cleanHandle)}?tab=activity`, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`GeeksforGeeks profile for '${handle}' not found or unreachable`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const userDataPayload = parseEmbeddedPayload<GFGUserDataPayload>($, "userData");
        const articleCountPayload = parseEmbeddedPayload<GFGArticleCountPayload>($, "articleCount");
        const info = userDataPayload?.data;

        if (userDataPayload?.error || !info) {
            throw new Error(`Could not parse GeeksforGeeks profile for '${handle}'`);
        }

        const title = getMetaContent($, 'meta[property="og:title"]') ?? $("title").text();
        const titleName = title.split("|")[0]?.split("-")[0]?.trim();
        const institution = info.institute_name || info.organization_name || null;

        return {
            success: true,
            platform: "gfg",
            handle: cleanHandle,
            name: info.name || titleName || cleanHandle,
            totalSolved: toNumber(info.total_problems_solved),
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            score: toNumber(info.score),
            monthlyScore: toNumber(info.monthly_score),
            institution,
            rank: info.institute_rank || null,
            avatar: info.profile_image_url || null,
            rating: 0,
            articlesPublished: toNumber(articleCountPayload?.total_articles_published),
            potdCurrentStreak: toNumber(info.pod_solved_current_streak_incl_timemachine ?? info.pod_solved_current_streak),
            potdLongestStreak: toNumber(info.pod_solved_longest_streak),
            potdSolved: toNumber(info.pod_correct_submissions_count),
            activity: [],
            contestHistory: [],
        };
    } catch (error) {
        console.error(`Error scraping GFG data for handle '${handle}':`, error);
        return {
            success: false,
            platform: "gfg",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}
