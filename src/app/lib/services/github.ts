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

        const contributionsPromise = process.env.GITHUB_TOKEN
            ? fetch("https://api.github.com/graphql", {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    query: `
                        query UserContributions($login: String!) {
                            user(login: $login) {
                                contributionsCollection {
                                    contributionCalendar {
                                        totalContributions
                                        weeks {
                                            contributionDays {
                                                date
                                                contributionCount
                                                color
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables: { login: handle }
                }),
                next: { revalidate: 3600 }
            })
            : null;

        const [response, reposResponse, contributionsResponse] = await Promise.all([
            fetch(`https://api.github.com/users/${handle}`, {
                headers,
                next: { revalidate: 3600 }
            }),
            fetch(`https://api.github.com/users/${handle}/repos?sort=updated&per_page=100`, {
                headers,
                next: { revalidate: 3600 }
            }),
            contributionsPromise
        ]);

        if(!response.ok){
            if(response.status===404){
                throw new Error(`GitHub user '${handle}' not found`)
            } else if(response.status === 403){
                throw new Error("GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your environment variables.");
            }
            throw new Error(`GitHub API returned an error: ${response.statusText}`)
        }

        const data = await response.json()
        const repos = reposResponse.ok ? await reposResponse.json() : [];
        const repoList = Array.isArray(repos) ? repos : [];
        const totalStars = repoList.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
        const totalForks = repoList.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
        const languageCounts = repoList.reduce<Record<string, number>>((acc, repo) => {
            if (repo.language) {
                acc[repo.language] = (acc[repo.language] || 0) + 1;
            }
            return acc;
        }, {});
        const topLanguages = Object.entries(languageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([language, count]) => ({ language, count }));
        const recentRepos = repoList.slice(0, 6).map((repo) => ({
            name: repo.name,
            description: repo.description,
            url: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            updatedAt: repo.updated_at
        }));
        const contributionsPayload = contributionsResponse?.ok ? await contributionsResponse.json() : null;
        const contributionCalendar =
            contributionsPayload?.data?.user?.contributionsCollection?.contributionCalendar ?? null;

        return{
            success: true,
            platform: "github",
            handle: data.login,
            name: data.name,
            bio: data.bio,
            company: data.company,
            location: data.location,
            blog: data.blog,
            publicRepos: data.public_repos,
            publicGists: data.public_gists,
            followers: data.followers,
            following: data.following,
            avatar: data.avatar_url,
            profileUrl: data.html_url,
            createdAt: data.created_at,
            totalStars,
            totalForks,
            topLanguages,
            recentRepos,
            contributionCalendar
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
