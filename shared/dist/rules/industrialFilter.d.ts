/**
 * 34 Documented Consumer-Facing Categories to Exclude
 */
export declare const CONSUMER_EXCLUSION_TYPES: Set<string>;
/**
 * High-value Industrial Keyword Patterns
 */
export declare const INDUSTRIAL_KEYWORDS: string[];
export interface BusinessClassificationInput {
    name: string;
    types?: string[];
    description?: string;
}
export interface BusinessClassificationResult {
    isIndustrial: boolean;
    isExcludedConsumer: boolean;
    matchedKeywords: string[];
    reason: string;
}
/**
 * Evaluates whether a place is genuine industrial B2B or consumer-facing.
 */
export declare function classifyIndustrialBusiness(input: BusinessClassificationInput): BusinessClassificationResult;
//# sourceMappingURL=industrialFilter.d.ts.map