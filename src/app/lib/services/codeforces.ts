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

        return{
            success: true,
            platform: "codeforces",
            handle: user.handle,
            rating: user.rating || 0,
            maxRating: user.maxRating || 0,
            rank: user.rank || "Unrated",
            avatar: user.avatar
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