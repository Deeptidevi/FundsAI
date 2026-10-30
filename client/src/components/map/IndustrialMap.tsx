import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { calculateBoundingBox, DirectionBias } from '@gmaps/shared';

export interface MapPlace {
  placeId: string;
  name: string;
  rating?: number | null;
  reviewCount?: number;
  tier?: string;
  phone?: string;
  phoneType?: string;
  address?: string;
  location?: { latitude: number; longitude: number };
  distanceMeters?: number;
  distanceKm?: string;
  website?: string;
  googleMapsUri?: string;
  primaryType?: string;
}

export type MapLayerType = 'STREET' | 'SATELLITE' | 'TOPO' | 'GOOGLE';

interface IndustrialMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  directionBias: DirectionBias;
  places: MapPlace[];
  centerName?: string;
  onCenterChange?: (coords: { lat: number; lng: number }) => void;
  onPlaceSelect?: (place: MapPlace) => void;
}

export const IndustrialMap: React.FC<IndustrialMapProps> = ({
  center,
  radiusKm,
  directionBias,
  places,
  centerName,
  onCenterChange,
  onPlaceSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('STREET');

  // Tile layer sources (100% Free, Zero Billing, High Performance)
  const getTileConfig = (layer: MapLayerType) => {
    switch (layer) {
      case 'SATELLITE':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles &copy; Esri World Imagery',
          maxZoom: 19,
        };
      case 'TOPO':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles &copy; Esri Topo Map',
          maxZoom: 19,
        };
      case 'GOOGLE':
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        };
      case 'STREET':
      default:
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles &copy; Esri World Street Map & OpenStreetMap',
          maxZoom: 19,
        };
    }
  };

  // Switch Layer
  const handleSwitchLayer = (type: MapLayerType) => {
    setActiveLayer(type);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const cfg = getTileConfig(type);
    currentTileLayerRef.current = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
    }).addTo(map);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: radiusKm <= 3 ? 14 : radiusKm <= 10 ? 12 : 11,
      zoomControl: true,
    });

    const cfg = getTileConfig('STREET');
    currentTileLayerRef.current = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Center marker with pulsing drag pin
    const centerIcon = L.divIcon({
      className: 'custom-center-pin',
      html: `<div style="background:#2563eb; width:30px; height:30px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 12px rgba(37,99,235,0.9); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:14px; font-weight:800; cursor:grab;">📍</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const centerMarker = L.marker([center.lat, center.lng], {
      icon: centerIcon,
      draggable: true,
      title: 'Search Centre (Drag pin or click map to move)',
    }).addTo(map);

    centerMarker.on('dragend', () => {
      const pos = centerMarker.getLatLng();
      if (onCenterChange) {
        onCenterChange({ lat: pos.lat, lng: pos.lng });
      }
    });

    // Map click sets center
    map.on('click', (e) => {
      if (onCenterChange) {
        onCenterChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    centerMarkerRef.current = centerMarker;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center, radius, and boundary visual
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng([center.lat, center.lng]);
    }

    map.setView([center.lat, center.lng], radiusKm <= 3 ? 14 : radiusKm <= 10 ? 12 : 11);

    // Update Circle (radius in meters)
    if (circleRef.current) {
      circleRef.current.remove();
    }
    circleRef.current = L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);

    // Update Bounding Box if directional bias active
    if (rectRef.current) {
      rectRef.current.remove();
    }

    if (directionBias !== 'ALL') {
      const box = calculateBoundingBox(center, radiusKm, directionBias);
      const bounds = L.latLngBounds([box.low.lat, box.low.lng], [box.high.lat, box.high.lng]);

      rectRef.current = L.rectangle(bounds, {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
    }
  }, [center, radiusKm, directionBias]);

  // Update Place Markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    places.forEach((place) => {
      if (!place.location?.latitude || !place.location?.longitude) return;

      const isGold = place.tier === 'Gold';
      const isSilver = place.tier === 'Silver';
      const pinColor = isGold ? '#d97706' : isSilver ? '#0284c7' : '#94a3b8';
      const badgeBg = isGold ? '#fef3c7' : isSilver ? '#e0f2fe' : '#f1f5f9';
      const badgeText = isGold ? '#92400e' : isSilver ? '#0369a1' : '#475569';

      const icon = L.divIcon({
        className: 'place-pin',
        html: `<div style="background-color: ${pinColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.6); cursor: pointer;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([place.location.latitude, place.location.longitude], { icon });

      const popupContent = `
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 220px; color: #0f172a; padding: 4px;">
          <div style="font-weight: 700; font-size: 13px; line-height: 1.3; margin-bottom: 4px;">${place.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${place.address || ''}</div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: ${badgeBg}; color: ${badgeText}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">${place.tier || 'Bronze'} Tier</span>
            <span style="font-size: 11px; font-weight: 600; color: #0f172a;">★ ${place.rating || 'N/A'} (${place.reviewCount || 0})</span>
            <span style="font-size: 11px; font-weight: 600; color: #2563eb;">📍 ${place.distanceKm || '0'} km</span>
          </div>
          ${place.phone ? `<div style="font-size: 11px; color: #059669; font-weight: 600; margin-bottom: 2px;">📞 ${place.phone} ${place.phoneType ? `(${place.phoneType})` : ''}</div>` : ''}
          ${place.website ? `<div style="font-size: 11px; margin-top: 4px;"><a href="${place.website}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">Official Website ↗</a></div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onPlaceSelect) onPlaceSelect(place);
      });

      layer.addLayer(marker);
    });

    if (places.length > 0 && mapInstanceRef.current && circleRef.current) {
      try {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds().pad(0.05));
      } catch (e) {}
    }
  }, [places, onPlaceSelect]);

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {/* Map Layer Switcher Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <span>📍 Search Perimeter Map ({radiusKm} km Radius)</span>
          <span className="text-[11px] text-slate-400 font-normal">(Click anywhere on map or drag pin to move)</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchLayer('STREET')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeLayer === 'STREET' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Street Map
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('SATELLITE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeLayer === 'SATELLITE' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('TOPO')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeLayer === 'TOPO' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏔️ Topo
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('GOOGLE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeLayer === 'GOOGLE' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 Google Maps
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[440px] rounded-2xl overflow-hidden border border-slate-800/90 shadow-inner"
      />

      {/* Map Perimeter Badge Readout */}
      <div className="flex flex-wrap items-center justify-between text-[11px] px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800/80 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold">📍 Centre:</span>
          <span>{centerName || 'Selected Location'}</span>
          <span className="text-slate-500 font-mono">({center.lat.toFixed(4)}, {center.lng.toFixed(4)})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">🎯 Boundary:</span>
          <span>{(radiusKm * 1000).toLocaleString()} metres ({radiusKm} km) circle perimeter</span>
        </div>
      </div>
    </div>
  );
};
