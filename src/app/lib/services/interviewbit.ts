export async function fetchInterviewBitUserInfo(handle: string) {
    try {
        const response = await fetch(`https://www.interviewbit.com/profile/${handle}`,{
            headers:{
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            next : {revalidate: 3600}
        })

        if(!response.ok){
            throw new Error(`InterviewBit profile '${handle}' not found or unreachable`)
        }
        const html = await response.text()

        // existing score
        const scoreMatch = html.match(/<div class="stat-value">(\d+)<\/div>\s*<div class="stat-label">Score<\/div>/i)

        const score = scoreMatch ? parseInt(scoreMatch[1],10) : 0

        // existing rank
        const rankMatch = html.match(/<div class="stat-value">(\d+)<\/div>\s*<div class="stat-label">Rank<\/div>/i)
        const rank = rankMatch ? parseInt(rankMatch[1],10) : 0

        //existing streak
        const streakMatch = html.match(/<div class="stat-value">(\d+)<\/div>\s*<div class="stat-label">Streak<\/div>/i)
        const streak = streakMatch ? parseInt(streakMatch[1],10) : 0

        return{
            success: true,
            platform: "interviewbit",
            handle: handle,
            score: score,
            rank: rank,
            streak: streak
        }
    } catch (error) {
        console.error(`Error fetching InterviewBit data for handle ${handle}:`,error)
        return{
            success: false,
            platform: "interviewbit",
            error: error instanceof Error ? error.message : "Unknown error occurred"
        }
    }
}