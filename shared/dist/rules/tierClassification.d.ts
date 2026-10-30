import { LeadTier } from '../types/index.js';
/**
 * Classifies a business based on Google rating and review count.
 * - Gold: Rating >= 4.5 and Reviews >= 100
 * - Silver: Rating >= 4.0 and Reviews >= 25
 * - Bronze: Rating < 4.0 or Reviews < 25 (or unrated)
 */
export declare function classifyBusinessTier(rating: number | undefined, reviewCount: number | undefined): LeadTier;
//# sourceMappingURL=tierClassification.d.ts.map