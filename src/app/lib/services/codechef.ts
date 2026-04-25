import * as cheerio from 'cheerio'

function normalizeText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function parseFullySolvedCount(text: string): number | null {
    const normalizedText = normalizeText(text);
    const fullySolvedMatch =
        normalizedText.match(/fully\s+solved[^\d]*(\d+)/i) ??
        normalizedText.match(/(\d+)[^\d]*fully\s+solved/i);

    return fullySolvedMatch ? parseInt(fullySolvedMatch[1], 10) : null;
}

function parseTotalProblemsSolvedCount(text: string): number | null {
    const normalizedText = normalizeText(text);
    const totalProblemsSolvedMatch = normalizedText.match(/total\s+problems\s+solved[^\d]*(\d+)/i);

    return totalProblemsSolvedMatch ? parseInt(totalProblemsSolvedMatch[1], 10) : null;
}

function parseFirstNumber(text: string): number | null {
    const normalizedText = normalizeText(text);
    const totalSolvedMatch = normalizedText.match(/\d+/);

    return totalSolvedMatch ? parseInt(totalSolvedMatch[0], 10) : null;
}

function parseCodeChefSolvedCount($: cheerio.CheerioAPI): number {
    const solvedSelectors = [
        '.rating-data-section.problems-solved',
        '.problems-solved',
        '.rating-data-section:contains("Solved")',
    ];

    const bodyText = $('body').text();
    const totalProblemsSolvedCount = parseTotalProblemsSolvedCount(bodyText);
    if (totalProblemsSolvedCount !== null) return totalProblemsSolvedCount;

    for (const selector of solvedSelectors) {
        const fullySolvedCount = parseFullySolvedCount($(selector).text());
        if (fullySolvedCount !== null) return fullySolvedCount;
    }

    const fullySolvedCount = parseFullySolvedCount(bodyText);
    if (fullySolvedCount !== null) return fullySolvedCount;

    for (const selector of solvedSelectors) {
        const fallbackCount = parseFirstNumber($(selector).text());
        if (fallbackCount !== null) return fallbackCount;
    }

    return 0;
}

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

        // CodeChef includes both fully and partially solved counts on some profiles.
        // The dashboard should count accepted problems, which maps to Fully Solved.
        const totalSolved = parseCodeChefSolvedCount($);

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
            totalSolved: totalSolved,
            stars: stars,
            avatar: avatar || null,
            contestHistory: [],
            activity: [],
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
