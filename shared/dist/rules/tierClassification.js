// Tier classification logic migrated from CompanyService.gs
/**
 * Classifies a business based on Google rating and review count.
 * - Gold: Rating >= 4.5 and Reviews >= 100
 * - Silver: Rating >= 4.0 and Reviews >= 25
 * - Bronze: Rating < 4.0 or Reviews < 25 (or unrated)
 */
export function classifyBusinessTier(rating, reviewCount) {
    const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    const safeReviews = typeof reviewCount === 'number' && !isNaN(reviewCount) ? reviewCount : 0;
    if (safeRating >= 4.5 && safeReviews >= 100) {
        return 'Gold';
    }
    if (safeRating >= 4.0 && safeReviews >= 25) {
        return 'Silver';
    }
    return 'Bronze';
}
//# sourceMappingURL=tierClassification.js.map