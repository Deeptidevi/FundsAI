// Geodetic Calculations & Bounding Boxes migrated from SearchService.gs
/**
 * 1 degree latitude is approximately 111.32 km anywhere on Earth.
 */
export const KM_PER_LAT_DEGREE = 111.32;
/**
 * Calculates km per degree longitude at a given latitude (curvature correction).
 */
export function getKmPerLngDegree(latitude) {
    const rad = (latitude * Math.PI) / 180;
    return KM_PER_LAT_DEGREE * Math.cos(rad);
}
/**
 * Calculates asymmetric or symmetric bounding box for Google Places API (New) rectangular search.
 */
export function calculateBoundingBox(center, radiusKm, bias = 'ALL') {
    const latDelta = radiusKm / KM_PER_LAT_DEGREE;
    const lngDelta = radiusKm / getKmPerLngDegree(center.lat);
    let northMult = 1.0;
    let southMult = 1.0;
    let eastMult = 1.0;
    let westMult = 1.0;
    switch (bias) {
        case 'NORTH':
            northMult = 1.3;
            southMult = 0.3;
            break;
        case 'SOUTH':
            southMult = 1.3;
            northMult = 0.3;
            break;
        case 'EAST':
            eastMult = 1.3;
            westMult = 0.3;
            break;
        case 'WEST':
            westMult = 1.3;
            eastMult = 0.3;
            break;
        case 'ALL':
        default:
            break;
    }
    return {
        low: {
            lat: center.lat - latDelta * southMult,
            lng: center.lng - lngDelta * westMult,
        },
        high: {
            lat: center.lat + latDelta * northMult,
            lng: center.lng + lngDelta * eastMult,
        },
    };
}
/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function calculateHaversineDistance(c1, c2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
    const lat1 = (c1.lat * Math.PI) / 180;
    const lat2 = (c2.lat * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
//# sourceMappingURL=geodetic.js.map