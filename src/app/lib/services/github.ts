export async function fetchGitHubUserInfo(handle: string) {
    try {
        const headers: HeadersInit = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CodeAtlas-App"
        }

        // Use of Personal Access Token if available to avoid strict rate limits
        if(process.env.GITHUB_TOKEN){
            headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }

        const response = await fetch(`https://api.github.com/users/${handle}`, {
            headers,
            next: { revalidate: 3600 }
        });

        if(!response.ok){
            if(response.status===404){
                throw new Error(`GitHub user '${handle}' not found`)
            } else if(response.status === 403){
                throw new Error("GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your environment variables.");
            }
            throw new Error(`GitHub API returned an error: ${response.statusText}`)
        }

        const data = await response.json()

        return{
            success: true,
            platform: "github",
            handle: data.login,
            publicRepos: data.public_repos,
            followers: data.followers,
            following: data.following,
            avatar: data.avatar_url,
            profileUrl: data.html_url
        }
    } catch (error) {
        console.error(`Error fetching GitHub data for handle ${handle}:`, error);
        return {
            success: false,
            platform: "github",
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}