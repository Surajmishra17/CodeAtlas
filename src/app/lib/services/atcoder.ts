export async function fetchAtCoderUserInfo(handle: string) {
    try {
        const response = await fetch(`https://atcoder.jp/users/${handle}/history/json`,{
            next: {revalidate: 3600}
        })

        if(!response.ok){
            if(response.status===404){
                throw new Error(`AtCoder user '${handle}' not found`)
            }
            throw new Error(`AtCoder API error: ${response.statusText}`)
        }

        const history = await response.json()

        //If the user exists but hasnot participated in any rated contests

        if (!Array.isArray(history) || history.length === 0) {
            return {
                success: false,
                platform: "atcoder",
                handle: handle,
                rating: 0,
                maxRating: 0,
                rank: "Unrated"
            }
        }

        // most recent rating
        const currentRating = history[history.length - 1].NewRating

        // max rating across all contests
        const maxRating = Math.max(...history.map((contest:any)=>contest.NewRating))

        let rankName = "Unrated"
        if (currentRating >= 2800) rankName = "Red";
        else if (currentRating >= 2400) rankName = "Orange";
        else if (currentRating >= 2000) rankName = "Yellow";
        else if (currentRating >= 1600) rankName = "Blue";
        else if (currentRating >= 1200) rankName = "Cyan";
        else if (currentRating >= 800) rankName = "Green";
        else if (currentRating >= 400) rankName = "Brown";
        else if (currentRating > 0) rankName = "Gray";

        return {
            success: true,
            platform: "atcoder",
            handle: handle,
            rating: currentRating,
            maxRating: maxRating,
            rank: rankName
        }
    } catch (error) {
        console.error(`Error fetching AtCoder user info for handle ${handle}:`, error)
        return {
            success: false,
            platform: "atcoder",
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}