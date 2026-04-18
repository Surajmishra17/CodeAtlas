const LEETCODE_GRAPHQL_QUERY = `
  query getUserStats($username: String!) {
    matchedUser(username: $username) {
      submissionCalendar
      username
      profile {
        ranking
        userAvatar
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      rating
      topPercentage
      badge {
        name
      }
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      contest {
        title
        startTime
      }
    }
  }
`;

type SubmissionCount = {
    difficulty: "All" | "Easy" | "Medium" | "Hard";
    count: number;
}

type LeetCodeContestHistory = {
    attended: boolean;
    rating: number;
    ranking: number;
    contest: {
        title: string;
        startTime: number;
    };
}

export async function fetchLeetCodeUserInfo(handle: string) {
    try {
        const response = await fetch("https://leetcode.com/graphql",{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            body: JSON.stringify({
                query: LEETCODE_GRAPHQL_QUERY,
                variables: {username:handle}
            }),
            next: {revalidate:3600}
        })

        const json = await response.json()

        if(!json.data || !json.data.matchedUser){
            throw new Error(`LeetCode user '${handle}' not found`)
        }

        const userData = json.data.matchedUser
        const submissions = userData.submitStatsGlobal.acSubmissionNum as SubmissionCount[]

        const totalSolved = submissions.find((s) => s.difficulty === "All")?.count || 0
        const easySolved = submissions.find((s) => s.difficulty === "Easy")?.count || 0
        const mediumSolved = submissions.find((s) => s.difficulty === "Medium")?.count || 0;
        const hardSolved = submissions.find((s) => s.difficulty === "Hard")?.count || 0;

        const submissionCalendarRaw = userData.submissionCalendar as string | null;
        let activity: Array<{ date: string; submissions: number }> = [];

        if (submissionCalendarRaw) {
            const parsed = JSON.parse(submissionCalendarRaw) as Record<string, number>;
            activity = Object.entries(parsed).map(([timestamp, submissions]) => ({
                date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
                submissions: submissions || 0,
            }));
        }

        const contestHistoryRaw = (json.data.userContestRankingHistory || []) as LeetCodeContestHistory[];
        const contestHistory = contestHistoryRaw
            .filter((item) => item.attended && item.contest?.startTime)
            .map((item, index, arr) => {
                const previous = arr[index - 1];
                const previousRating = previous?.rating ?? null;

                return {
                    contestName: item.contest.title,
                    rank: item.ranking || null,
                    rating: Math.round(item.rating || 0),
                    ratingChange:
                        previousRating === null
                            ? null
                            : Math.round((item.rating || 0) - previousRating),
                    date: new Date(item.contest.startTime * 1000).toISOString(),
                };
            });

        const contestRating = Math.round(json.data.userContestRanking?.rating || 0);
        const contestBadge = json.data.userContestRanking?.badge?.name || null;

        return {
            success: true,
            platform: "leetcode",
            handle: userData.username,
            totalSolved: totalSolved,
            easySolved: easySolved,
            mediumSolved: mediumSolved,
            hardSolved: hardSolved,
            rank: userData.profile.ranking || 0,
            avatar: userData.profile.userAvatar,
            contestRating,
            contestBadge,
            contestHistory,
            activity,
        }
    } catch (error) {
        console.error(`Error fetching LeetCode data for handle ${handle}:`, error);
        return {
            success: false,
            platform: "leetcode",
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}
