import { Coordinates } from '../geo/geodetic.js';
export interface DeduplicationEntity {
    id?: string;
    placeId?: string;
    companyName: string;
    normalizedPhone?: string;
    coords?: Coordinates;
}
export interface DeduplicationResult {
    isDuplicate: boolean;
    duplicateReason?: 'place_id' | 'phone_match' | 'spatial_proximity';
    matchedId?: string;
    isPreservedBranch?: boolean;
}
/**
 * Branch Preservation Distance Threshold: 500 meters.
 * If two facilities share identical or similar corporate names but are separated by > 500m,
 * they are treated as distinct manufacturing/operational branches rather than duplicates.
 */
export declare const BRANCH_PRESERVATION_DISTANCE_METERS = 500;
/**
 * Checks whether a candidate entity is a duplicate of an existing record or a preserved branch.
 */
export declare function checkDuplicateWithBranchPreservation(candidate: DeduplicationEntity, existingList: DeduplicationEntity[]): DeduplicationResult;
//# sourceMappingURL=deduplication.d.ts.map