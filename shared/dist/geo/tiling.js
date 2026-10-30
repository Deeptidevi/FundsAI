// Area Grid Tiling logic migrated from SearchService.gs
import { KM_PER_LAT_DEGREE, getKmPerLngDegree } from './geodetic.js';
/**
 * Creates overlapping geographic tiles when search radius exceeds 12 km
 * to overcome Google Places API 60-result hard limit.
 */
export function generateSearchTiles(center, radiusKm) {
    if (radiusKm <= 12) {
        // Single tile
        const latDelta = radiusKm / KM_PER_LAT_DEGREE;
        const lngDelta = radiusKm / getKmPerLngDegree(center.lat);
        return [
            {
                index: 0,
                center,
                box: {
                    low: { lat: center.lat - latDelta, lng: center.lng - lngDelta },
                    high: { lat: center.lat + latDelta, lng: center.lng + lngDelta },
                },
            },
        ];
    }
    // Subdivide large area into 2x2 quadrants (4 sectors) with 10% overlap
    const latDelta = radiusKm / KM_PER_LAT_DEGREE;
    const lngDelta = radiusKm / getKmPerLngDegree(center.lat);
    const halfLat = latDelta * 0.5;
    const halfLng = lngDelta * 0.5;
    const sectors = [
        { latOffset: halfLat, lngOffset: -halfLng }, // NW
        { latOffset: halfLat, lngOffset: halfLng }, // NE
        { latOffset: -halfLat, lngOffset: -halfLng }, // SW
        { latOffset: -halfLat, lngOffset: halfLng }, // SE
    ];
    const sectorRadiusKm = radiusKm * 0.6; // 10% overlap
    return sectors.map((s, idx) => {
        const sCenter = {
            lat: center.lat + s.latOffset,
            lng: center.lng + s.lngOffset,
        };
        const sLatDelta = sectorRadiusKm / KM_PER_LAT_DEGREE;
        const sLngDelta = sectorRadiusKm / getKmPerLngDegree(sCenter.lat);
        return {
            index: idx,
            center: sCenter,
            box: {
                low: { lat: sCenter.lat - sLatDelta, lng: sCenter.lng - sLngDelta },
                high: { lat: sCenter.lat + sLatDelta, lng: sCenter.lng + sLngDelta },
            },
        };
    });
}
//# sourceMappingURL=tiling.js.map