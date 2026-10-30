export interface Coordinates {
    lat: number;
    lng: number;
}
export interface BoundingBox {
    low: Coordinates;
    high: Coordinates;
}
export type DirectionBias = 'ALL' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
/**
 * 1 degree latitude is approximately 111.32 km anywhere on Earth.
 */
export declare const KM_PER_LAT_DEGREE = 111.32;
/**
 * Calculates km per degree longitude at a given latitude (curvature correction).
 */
export declare function getKmPerLngDegree(latitude: number): number;
/**
 * Calculates asymmetric or symmetric bounding box for Google Places API (New) rectangular search.
 */
export declare function calculateBoundingBox(center: Coordinates, radiusKm: number, bias?: DirectionBias): BoundingBox;
/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export declare function calculateHaversineDistance(c1: Coordinates, c2: Coordinates): number;
//# sourceMappingURL=geodetic.d.ts.map