import * as cheerio from 'cheerio'

export async function fetchCodeChefUserInfo(handle: string) {
    try {
        
        const response = await fetch(`https://www.codechef.com/users/${handle}`,{
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            next: {revalidate: 3600}
        })

        if(!response.ok){
            throw new Error(`CodeChef profile for '${handle}' not found or unreachable`)
        }

        const html = await response.text()

        // load html into cheerio so we can query it like json query
        const $ = cheerio.load(html)

        const ratingStr = $('.rating-number').text()
        const rating = parseInt(ratingStr) || 0

        if(!ratingStr){
            throw new Error(`Could not parse data for '${handle}'. Are you sure the handle is correct?`)
        }

        const maxRatingStr = $('.rating-header small').text();
        const maxRatingMatch = maxRatingStr.match(/\d+/);
        const maxRating = maxRatingMatch ? parseInt(maxRatingMatch[0]) : rating;

        // Extracting star rating (e.g., "3 star")
        const stars = $('.rating-star').text().trim() || "Unrated";

        // Extracting profile image avatar
        const avatar = $('.user-details-container header img').attr('src');

        return {
            success: true,
            platform: "codechef",
            handle: handle,
            rating: rating,
            maxRating: maxRating,
            stars: stars,
            avatar: avatar || null
        };
    } catch (error) {
        console.error(`Error scraping CodeChef data for handle ${handle}:`, error);
        return {
            success: false,
            platform: "codechef",
            error: error instanceof Error ? error.message : "Unknown error occurred"
        }
    }
}