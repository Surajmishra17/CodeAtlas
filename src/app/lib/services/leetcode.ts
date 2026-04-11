const LEETCODE_GRAPHQL_QUERY = `
  query getUserStats($username: String!) {
    matchedUser(username: $username) {
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
  }
`;

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
                variable: {username:handle}
            }),
            next: {revalidate:3600}
        })

        const json = await response.json()

        if(!json.data || !json.data.matchedUser){
            throw new Error(`LeetCode user '${handle}' not found`)
        }

        const userData = json.data.matchedUser
        const submissions = userData.submitStatsGlobal.acSubmissionNum

        const totalSolved = submissions.find((s: any) => s.difficulty === "All")?.count || 0
        const easySolved = submissions.find((s: any) => s.difficulty === "Easy")?.count || 0
        const mediumSolved = submissions.find((s: any) => s.difficulty === "Medium")?.count || 0;
        const hardSolved = submissions.find((s: any) => s.difficulty === "Hard")?.count || 0;

        return {
            success: true,
            platform: "leetcode",
            handle: userData.username,
            totalSolved: totalSolved,
            easySolved: easySolved,
            mediumSolved: mediumSolved,
            hardSolved: hardSolved,
            rank: userData.profile.ranking || 0,
            avatar: userData.profile.userAvatar
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