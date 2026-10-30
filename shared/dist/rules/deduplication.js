// Multi-factor Deduplication & Branch Preservation migrated from CompanyService.gs
import { calculateHaversineDistance } from '../geo/geodetic.js';
/**
 * Branch Preservation Distance Threshold: 500 meters.
 * If two facilities share identical or similar corporate names but are separated by > 500m,
 * they are treated as distinct manufacturing/operational branches rather than duplicates.
 */
export const BRANCH_PRESERVATION_DISTANCE_METERS = 500;
/**
 * Checks whether a candidate entity is a duplicate of an existing record or a preserved branch.
 */
export function checkDuplicateWithBranchPreservation(candidate, existingList) {
    for (const existing of existingList) {
        // 1. Exact Google Place ID match is always a duplicate
        if (candidate.placeId && existing.placeId && candidate.placeId === existing.placeId) {
            return {
                isDuplicate: true,
                duplicateReason: 'place_id',
                matchedId: existing.id,
            };
        }
        // 2. Phone match check
        if (candidate.normalizedPhone &&
            existing.normalizedPhone &&
            candidate.normalizedPhone === existing.normalizedPhone) {
            // If phone matches, check spatial distance to see if it's a separate branch with shared corporate EPABX
            if (candidate.coords && existing.coords) {
                const dist = calculateHaversineDistance(candidate.coords, existing.coords);
                if (dist > BRANCH_PRESERVATION_DISTANCE_METERS) {
                    return {
                        isDuplicate: false,
                        isPreservedBranch: true,
                        matchedId: existing.id,
                    };
                }
            }
            return {
                isDuplicate: true,
                duplicateReason: 'phone_match',
                matchedId: existing.id,
            };
        }
        // 3. Name similarity check with Branch Preservation
        const cleanCandName = candidate.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanExistName = existing.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanCandName.length > 3 && cleanCandName === cleanExistName) {
            if (candidate.coords && existing.coords) {
                const dist = calculateHaversineDistance(candidate.coords, existing.coords);
                if (dist > BRANCH_PRESERVATION_DISTANCE_METERS) {
                    // Both have same name, but > 500 meters apart -> Preserved Branch (e.g. Unit 1 vs Unit 2)
                    return {
                        isDuplicate: false,
                        isPreservedBranch: true,
                        matchedId: existing.id,
                    };
                }
                else {
                    return {
                        isDuplicate: true,
                        duplicateReason: 'spatial_proximity',
                        matchedId: existing.id,
                    };
                }
            }
        }
    }
    return { isDuplicate: false };
}
//# sourceMappingURL=deduplication.js.map