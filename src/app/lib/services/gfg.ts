export async function fetchGFGUserInfo(handle: string) {
    try {
        const cleanHandle = handle.trim().replace(/:$/, "");
        const response = await fetch(`https://geeks-for-geeks-api.vercel.app/${cleanHandle}`,{
            next: {revalidate: 3600}
        })

        const data = await response.json()

        if(data.error || !data.info){
            throw new Error(`GeeksforGeeks user '${handle}' not found`)
        }

        const info = data.info

        return{
            success: true,
            platform: "gfg",
            handle: info.username || handle,
            totalSolved: info.totalProblemSolved || 0,
            easySolved: info.easy || 0,
            mediumSolved: info.medium || 0,
            hardSolved: info.hard || 0,
            score: info.codingScore || 0,
            institution: info.institution || null,
            avatar: info.profilePicture || null,
            rating: info.rating || 0
        }
    } catch (error) {
        console.error(`Error fetching GFG data for handle '${handle}:'`, error)
        return{
            success: false,
            platform: "gfg",
            error: error instanceof Error ? error.message : "Unknown error occured"
        }
    }
}