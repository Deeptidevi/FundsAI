// Industrial Business Filtering & Consumer Exclusion migrated from Config.gs & CompanyService.gs
/**
 * 34 Documented Consumer-Facing Categories to Exclude
 */
export const CONSUMER_EXCLUSION_TYPES = new Set([
    'bakery',
    'bar',
    'beauty_salon',
    'book_store',
    'bowling_alley',
    'cafe',
    'campground',
    'car_wash',
    'casino',
    'clothing_store',
    'convenience_store',
    'department_store',
    'florist',
    'hair_care',
    'jewelry_store',
    'laundry',
    'liquor_store',
    'lodging',
    'movie_theater',
    'museum',
    'night_club',
    'park',
    'pet_store',
    'pharmacy',
    'physiotherapist',
    'restaurant',
    'rv_park',
    'school',
    'shoe_store',
    'shopping_mall',
    'spa',
    'stadium',
    'supermarket',
    'zoo',
]);
/**
 * High-value Industrial Keyword Patterns
 */
export const INDUSTRIAL_KEYWORDS = [
    'manufacturer',
    'manufacturing',
    'engineering',
    'fabrication',
    'fabricators',
    'industrial',
    'industries',
    'foundry',
    'forge',
    'forgings',
    'machining',
    'automation',
    'earthing',
    'electronics',
    'packaging',
    'polymers',
    'plastics',
    'sheet metal',
    'tooling',
    'dies',
    'moulds',
    'cables',
    'transformers',
    'pumps',
    'valves',
    'boiler',
    'steel',
    'aluminum',
    'metal',
    'chemicals',
    'chemical',
    'processing',
    'warehouse',
    'logistics',
];
/**
 * Evaluates whether a place is genuine industrial B2B or consumer-facing.
 */
export function classifyIndustrialBusiness(input) {
    const types = input.types || [];
    const textToCheck = `${input.name} ${input.description || ''}`.toLowerCase();
    // 1. Check for consumer exclusion types
    for (const t of types) {
        if (CONSUMER_EXCLUSION_TYPES.has(t.toLowerCase())) {
            return {
                isIndustrial: false,
                isExcludedConsumer: true,
                matchedKeywords: [],
                reason: `Excluded consumer type: ${t}`,
            };
        }
    }
    // 2. Match industrial keywords
    const matchedKeywords = [];
    for (const kw of INDUSTRIAL_KEYWORDS) {
        if (textToCheck.includes(kw)) {
            matchedKeywords.push(kw);
        }
    }
    if (matchedKeywords.length > 0) {
        return {
            isIndustrial: true,
            isExcludedConsumer: false,
            matchedKeywords,
            reason: `Matched industrial keywords: ${matchedKeywords.slice(0, 3).join(', ')}`,
        };
    }
    // 3. Fallback: check if type contains industrial indicators
    const industrialTypes = ['establishment', 'point_of_interest', 'factory', 'storage'];
    const hasIndustrialType = types.some((t) => industrialTypes.includes(t.toLowerCase()));
    return {
        isIndustrial: hasIndustrialType,
        isExcludedConsumer: false,
        matchedKeywords: [],
        reason: hasIndustrialType ? 'General business establishment' : 'Unqualified business category',
    };
}
//# sourceMappingURL=industrialFilter.js.map