type CodeforcesStatusSubmission = {
    verdict?: string;
    creationTimeSeconds: number;
    problem: {
        contestId: number;
        index: string;
    };
}

export type CodeforcesRatingEntry = {
    contestId: number;
    contestName: string;
    rank: number;
    ratingUpdateTimeSeconds: number;
    oldRating: number;
    newRating: number;
}

export async function fetchCodeforcesUserInfo(handle: string) {
    try {
        const response = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`,{
            next: {revalidate: 3600}
        })

        const data = await response.json()

        if(data.status !== 'OK'){
            throw new Error(data.comment || "Codeforces API error")
        }

        const user = data.result[0]

        const statusResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`, {
            next: { revalidate: 3600 }
        });
        const statusData = await statusResponse.json();

        let totalSolved = 0;
        const activityByDate = new Map<string, number>();

        if (statusData.status === 'OK') {
            const submissions = statusData.result;

            const solvedProblems = new Set<string>();

            (submissions as CodeforcesStatusSubmission[]).forEach((submission) => {
                const date = new Date(submission.creationTimeSeconds * 1000).toISOString().slice(0, 10);
                activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1);

                if (submission.verdict === 'OK') {
                    const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
                    solvedProblems.add(problemId);
                }
            });

            totalSolved = solvedProblems.size;
        }

        const ratingResponse = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`, {
            next: { revalidate: 3600 }
        });
        const ratingData = await ratingResponse.json();

        const history = ratingData.status === 'OK' ? ratingData.result as CodeforcesRatingEntry[] : [];

        return{
            success: true,
            platform: "codeforces",
            handle: user.handle,
            totalSolved: totalSolved,
            rating: user.rating || 0,
            maxRating: user.maxRating || 0,
            rank: user.rank || "Unrated",
            avatar: user.avatar,
            history,
            activity: [...activityByDate.entries()].map(([date, submissions]) => ({ date, submissions })),
        }

    } catch (error) {
        console.error(`Error fetching Codeforces user info for handle ${handle}:`, error)

        return {
            success: false,
            platform: "codeforces",
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}
