import { Coordinates, BoundingBox } from './geodetic.js';
export interface GridTile {
    index: number;
    center: Coordinates;
    box: BoundingBox;
}
/**
 * Creates overlapping geographic tiles when search radius exceeds 12 km
 * to overcome Google Places API 60-result hard limit.
 */
export declare function generateSearchTiles(center: Coordinates, radiusKm: number): GridTile[];
//# sourceMappingURL=tiling.d.ts.map