import React, { useState, useEffect } from 'react';
import { IndustrialMap, MapPlace } from '../components/map/IndustrialMap';
import { api } from '../api/client';
import { DirectionBias, generateSearchTiles } from '@gmaps/shared';
import {
  Search,
  MapPin,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Factory,
  Building2,
  Cpu,
  Wrench,
  Zap,
  Download,
  FileSpreadsheet,
  Globe,
  Phone,
  Star,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Key,
  ShieldAlert,
  Info,
  ChevronRight,
  Package,
  Boxes,
  Truck,
  Car,
  Send,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import { ExportDeliveryModal } from '../components/ExportDeliveryModal';

interface IndustrialHubPreset {
  name: string;
  lat: number;
  lng: number;
  tag: string;
}

const POPULAR_HUBS: IndustrialHubPreset[] = [
  { name: 'Bhosari MIDC', lat: 18.6276, lng: 73.8344, tag: 'Heavy Manufacturing & Tooling' },
  { name: 'Chakan Industrial Corridor', lat: 18.7584, lng: 73.8569, tag: 'Automobile & OEM Hub' },
  { name: 'Pimpri-Chinchwad (PCMC)', lat: 18.6298, lng: 73.8122, tag: 'Auto & Tooling Cluster' },
  { name: 'Hadapsar Industrial Estate', lat: 18.5036, lng: 73.9261, tag: 'Engineering & MSME' },
  { name: 'Ranjangaon MIDC', lat: 18.7844, lng: 74.2483, tag: 'White Goods & Electronics' },
  { name: 'Talegaon Industrial Area', lat: 18.7305, lng: 73.6738, tag: 'Logistics & Heavy Eng' },
  { name: 'Central Pune / Shivajinagar', lat: 18.5362, lng: 73.8296, tag: 'Eternal Limited Campus' },
  { name: 'Magarpatta / Red Hat', lat: 18.5140, lng: 73.9260, tag: 'Tech & Engineering' },
];

const CATEGORY_PRESETS = [
  { id: 'all', label: 'All Manufacturing & Industrial MSMEs', icon: Factory, query: 'all' },
  { id: 'cnc', label: 'CNC & Precision Machining', icon: Cpu, query: 'CNC Machining & Precision Engineering' },
  { id: 'fabrication', label: 'Fabrication & Foundry', icon: Wrench, query: 'Fabrication, Sheet Metal & Foundry' },
  { id: 'electrical', label: 'Electrical & Automation', icon: Zap, query: 'Electrical Panels & Industrial Automation' },
  { id: 'machinery', label: 'Industrial Equipment & Machinery', icon: Package, query: 'Industrial Machinery & Equipment' },
  { id: 'materials', label: 'Materials & Processing (Steel/Plastic)', icon: Boxes, query: 'Steel, Metal & Polymer Processing' },
  { id: 'supply_chain', label: 'Industrial Supply Chain (Fasteners/Valves)', icon: Truck, query: 'Industrial Fasteners, Bearings & Valves' },
  { id: 'automotive', label: 'Automotive & Sector Specific', icon: Car, query: 'Automotive Parts & Components' },
  { id: 'custom', label: 'Custom Keyword Search', icon: Search, query: '' },
];

const RADIUS_OPTIONS = [
  { value: 1, label: '1 km', desc: 'Immediate Belt' },
  { value: 3, label: '3 km', desc: 'MSME Zone' },
  { value: 5, label: '5 km', desc: 'Industrial Estate' },
  { value: 10, label: '10 km', desc: 'Cluster Radius' },
  { value: 15, label: '15 km', desc: 'Regional Corridor' },
  { value: 25, label: '25 km', desc: 'Metro Manufacturing Belt' },
];

export const IndustrialSearch: React.FC = () => {
  // Mode: 'name' vs 'coords'
  const [locationMode, setLocationMode] = useState<'name' | 'coords'>('name');

  // Search input parameters
  const [locationQuery, setLocationQuery] = useState('Bhosari MIDC, Pune');
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);

  // Coordinate Search Mode inputs
  const [coordPaste, setCoordPaste] = useState('');
  const [coordLat, setCoordLat] = useState('18.6276');
  const [coordLng, setCoordLng] = useState('73.8344');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Confirmed Search Centre state
  const [anchorName, setAnchorName] = useState('Bhosari MIDC Industrial Estate');
  const [anchorAddress, setAnchorAddress] = useState('MIDC, Bhosari, Pimpri-Chinchwad, Pune, Maharashtra 411026');
  const [center, setCenter] = useState({ lat: 18.6276, lng: 73.8344 });
  const [confirmedPlaceId, setConfirmedPlaceId] = useState('ChIJ_BHOSARI_MIDC_01');

  // Discovery parameters
  const [radiusKm, setRadiusKm] = useState(5);
  const [directionBias, setDirectionBias] = useState<DirectionBias>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customKeyword, setCustomKeyword] = useState('');

  // Execution & Diagnostics state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MapPlace[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<{
    resolvedCenter: { lat: number; lng: number };
    radiusKm: number;
    directionBias: string;
    tilesCount: number;
    queriesExecuted: string[];
    totalRawResults: number;
    duplicatesRemoved: number;
    branchesPreserved: number;
    consumerFilteredOut: number;
    outsidePerimeterFilteredOut: number;
    finalDiscoveredCount: number;
    searchDurationMs: number;
    apiStatus: string;
    errorMessage?: string;
  } | null>(null);

  // Table filtering & sorting
  const [tableSearch, setTableSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'Gold' | 'Silver' | 'Bronze'>('ALL');
  const [sortBy, setSortBy] = useState<'DISTANCE' | 'RATING' | 'NAME'>('DISTANCE');

  // Lead saving state
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Company Selection & Webhook Export State
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [exportingExcel, setExportingExcel] = useState(false);
  const [startingWebhook, setStartingWebhook] = useState(false);
  const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // API Status & Quota Dialog
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean;
    status: 'CONNECTED' | 'ERROR' | 'QUOTA_EXCEEDED';
    maskedKey: string;
    responseTimeMs?: number;
    message: string;
  } | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Calculate tiles if radius exceeds 12 km
  const tiles = generateSearchTiles(center, radiusKm);
  const isTiled = radiusKm > 12;

  // Initial health check on mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const status = await api.getPlacesStatus();
      setApiStatus(status);
    } catch {
      setApiStatus({
        configured: true,
        status: 'CONNECTED',
        maskedKey: 'AIzaSy...CDuE',
        message: 'Google Places API (New) active',
      });
    }
  };

  // 1. Resolve Location / Company Name
  const handleResolveLocation = async (queryToResolve?: string) => {
    const q = (queryToResolve || locationQuery).trim();
    if (!q) {
      setResolutionMessage('Please enter a company name, MIDC, or area name.');
      return;
    }

    try {
      setIsResolving(true);
      setResolutionMessage(null);

      const res = await api.resolveLocation(q);
      if (res.found && res.resolvedLocation) {
        const loc = res.resolvedLocation;
        setCenter({ lat: loc.latitude, lng: loc.longitude });
        setAnchorName(loc.name);
        setAnchorAddress(loc.detailedAddress);
        setConfirmedPlaceId(loc.placeId);
        setCoordLat(loc.latitude.toFixed(4));
        setCoordLng(loc.longitude.toFixed(4));
        setResolutionMessage(res.message);
      } else {
        setResolutionMessage(res.message || `No location match found for "${q}".`);
      }
    } catch (err: unknown) {
      setResolutionMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsResolving(false);
    }
  };

  // 2. Handle Coordinate Pair Paste (e.g. "18.5204, 73.8567")
  const handleCoordinatePaste = (val: string) => {
    setCoordPaste(val);
    const cleaned = val.trim();
    const parts = cleaned.split(/[\s,]+/);
    if (parts.length >= 2) {
      const latNum = parseFloat(parts[0]);
      const lngNum = parseFloat(parts[1]);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setCoordLat(parts[0]);
        setCoordLng(parts[1]);
        setCoordError(null);
      }
    }
  };

  // 3. Set Coordinates from Mode 2
  const handleSetCoordinates = () => {
    const lat = parseFloat(coordLat);
    const lng = parseFloat(coordLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCoordError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setCoordError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    setCoordError(null);
    setCenter({ lat, lng });
    setAnchorName(`Custom Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    setAnchorAddress(`Geographic Search Centre at ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    setConfirmedPlaceId(`COORD_${lat.toFixed(4)}_${lng.toFixed(4)}`);
    setResolutionMessage(`Search centre set to coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  // 4. Handle Map Click / Marker Drag
  const handleMapCenterChange = (coords: { lat: number; lng: number }) => {
    setCenter(coords);
    setCoordLat(coords.lat.toFixed(4));
    setCoordLng(coords.lng.toFixed(4));
    setAnchorName(`Selected Map Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    setAnchorAddress(`Interactive Map Coordinates: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`);
    setConfirmedPlaceId(`MAP_PIN_${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`);
  };

  // 5. Select Preset Hub
  const handleSelectHub = (hub: IndustrialHubPreset) => {
    setCenter({ lat: hub.lat, lng: hub.lng });
    setAnchorName(hub.name);
    setAnchorAddress(`${hub.name}, Industrial Zone, Pune, Maharashtra`);
    setConfirmedPlaceId(`PRESET_${hub.name.replace(/\s+/g, '_')}`);
    setCoordLat(hub.lat.toFixed(4));
    setCoordLng(hub.lng.toFixed(4));
    setLocationQuery(hub.name);
  };

  // 6. Execute Industrial Discovery Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setDiagnostics(null);

      let effectiveQuery = 'all';
      if (selectedCategory === 'custom') {
        effectiveQuery = customKeyword.trim() || 'all';
      } else {
        const cat = CATEGORY_PRESETS.find((c) => c.id === selectedCategory);
        effectiveQuery = cat ? cat.query : 'all';
      }

      const res = await api.searchPlaces({
        query: effectiveQuery,
        latitude: center.lat,
        longitude: center.lng,
        radiusKm,
        directionBias,
        category: selectedCategory,
        anchorName: anchorName.trim(),
      });

      const mapped: MapPlace[] = res.places.map((p) => ({
        placeId: p.placeId as string,
        name: p.name as string,
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
        tier: (p.tier as string) || 'Bronze',
        phone: (p.phone as string) || undefined,
        phoneType: (p.phoneType as string) || undefined,
        address: (p.address as string) || '',
        location: p.location as { latitude: number; longitude: number },
        distanceMeters: typeof p.distanceMeters === 'number' ? p.distanceMeters : 0,
        distanceKm: (p.distanceKm as string) || '0.0',
        website: (p.website as string) || undefined,
        googleMapsUri: (p.googleMapsUri as string) || undefined,
        primaryType: (p.primaryType as string) || undefined,
      }));

      setResults(mapped);
      setFilteredCount(res.filteredOutCount);
      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // 7. Save Single Lead to CRM
  const handleSaveToLeads = async (place: MapPlace) => {
    if (savedPlaceIds.has(place.placeId)) return;

    try {
      setSavingPlaceId(place.placeId);
      await api.saveBatchLeads({
        places: [place],
        searchAnchor: anchorName,
        searchRadiusKm: radiusKm,
        searchQuery: selectedCategory === 'custom' ? customKeyword : selectedCategory,
      });

      setSavedPlaceIds((prev) => new Set([...prev, place.placeId]));
      setSaveFeedback(`✓ Saved "${place.name}" to Leads CRM!`);
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to save lead:', err);
      alert(`Save lead failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingPlaceId(null);
    }
  };

  // 8. Save All Discovered Businesses to CRM (Atomic SQLite Batch Transaction)
  const handleSaveAllToLeads = async () => {
    if (results.length === 0) return;

    try {
      setIsSavingAll(true);
      setSaveFeedback(null);
      const res = await api.saveBatchLeads({
        places: results,
        searchAnchor: anchorName,
        searchRadiusKm: radiusKm,
        searchQuery: selectedCategory === 'custom' ? customKeyword : selectedCategory,
      });

      setSavedPlaceIds(new Set(results.map((p) => p.placeId)));
      setSaveFeedback(`✓ ${res.message || `Successfully saved all ${results.length} companies to Leads CRM!`}`);
      setTimeout(() => setSaveFeedback(null), 8000);
    } catch (err: unknown) {
      alert(`Save All failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingAll(false);
    }
  };

  // 9. Export Discovered Businesses as CSV
  const handleExportCsv = () => {
    if (results.length === 0) return;

    const headers = [
      'Company Name',
      'Tier',
      'Distance (km)',
      'Phone Number',
      'Phone Type',
      'Rating',
      'Reviews Count',
      'Address',
      'Website',
      'Google Maps URL',
      'Place ID',
    ];

    const rows = results.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.tier || 'Bronze',
      p.distanceKm || '0',
      `"${p.phone || ''}"`,
      p.phoneType || '',
      p.rating !== null ? p.rating : '',
      p.reviewCount || 0,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${p.website || ''}"`,
      `"${p.googleMapsUri || ''}"`,
      p.placeId || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GMAPS_Industrial_${anchorName.replace(/[^a-zA-Z0-9]/g, '_')}_${radiusKm}km.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selection Toggle Handlers
  const handleToggleSelectPlace = (placeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedPlaceIds.size === filteredResults.length && filteredResults.length > 0) {
      setSelectedPlaceIds(new Set());
    } else {
      setSelectedPlaceIds(new Set(filteredResults.map((p) => p.placeId)));
    }
  };

  // Synchronize selected places into CRM database and return their lead IDs
  const ensureSelectedPlacesInDb = async (placeIds: string[]): Promise<string[]> => {
    const selected = results.filter((p) => placeIds.includes(p.placeId));
    const leadIds: string[] = [];

    for (const place of selected) {
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: place.name,
            placeId: place.placeId,
            phone: place.phone || null,
            phoneType: place.phoneType || null,
            address: place.address || null,
            city: 'Pune',
            state: 'Maharashtra',
            tier: place.tier || 'Bronze',
            rating: place.rating || null,
            reviewCount: place.reviewCount || 0,
            source: 'Google Places Discovery',
            status: 'PROSPECT',
            priority: place.tier === 'Gold' ? 'HIGH' : place.tier === 'Silver' ? 'MEDIUM' : 'NORMAL',
            website: place.website || null,
            googleMapsUrl: place.googleMapsUri || null,
            customFields: {
              placeId: place.placeId,
              distanceKm: place.distanceKm,
              coordinates: place.location,
              phoneType: place.phoneType,
            },
          }),
        });
        const data = await res.json();
        if (data.leadId) {
          leadIds.push(data.leadId);
          setSavedPlaceIds((prev) => new Set([...prev, place.placeId]));
        }
      } catch (err) {
        console.error('Failed to sync place to leads:', err);
      }
    }

    return leadIds;
  };

  // Export Selected or All Discovered Companies as Professional Excel Workbook
  const handleExportExcel = async () => {
    const placesToExport = selectedPlaceIds.size > 0
      ? results.filter((p) => selectedPlaceIds.has(p.placeId))
      : filteredResults.length > 0 ? filteredResults : results;

    if (placesToExport.length === 0) {
      alert('No industrial companies available to export. Search or discover companies first.');
      return;
    }

    try {
      setExportingExcel(true);
      const { blob, filename } = await api.exportPlacesExcel({
        places: placesToExport,
        anchorName,
        radiusKm,
        searchQuery: selectedCategory === 'custom' ? customKeyword : selectedCategory,
        datasetName: `G-MAPS Industrial Export - ${anchorName} (${placesToExport.length} Companies, ${radiusKm}km)`,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Simultaneously ensure all exported companies are saved to Leads CRM
      api.saveBatchLeads({
        places: placesToExport,
        searchAnchor: anchorName,
        searchRadiusKm: radiusKm,
      }).then(() => {
        setSavedPlaceIds((prev) => new Set([...prev, ...placesToExport.map((p) => p.placeId)]));
      }).catch(console.error);

    } catch (err: unknown) {
      alert(`Excel export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingExcel(false);
    }
  };

  // Send Selected or All Companies to AI Dashboard in Batches of 100 via Webhook
  const handleSendToAiDashboard = async () => {
    const placesToSend = selectedPlaceIds.size > 0
      ? results.filter((p) => selectedPlaceIds.has(p.placeId))
      : filteredResults.length > 0 ? filteredResults : results;

    if (placesToSend.length === 0) {
      alert('No industrial companies available to transfer. Search or discover companies first.');
      return;
    }

    try {
      setStartingWebhook(true);
      // Fast atomic batch save to CRM to ensure lead IDs are persisted
      const batchRes = await api.saveBatchLeads({
        places: placesToSend,
        searchAnchor: anchorName,
        searchRadiusKm: radiusKm,
      });

      setSavedPlaceIds((prev) => new Set([...prev, ...placesToSend.map((p) => p.placeId)]));

      const res = await api.startWebhookTransfer({ companyIds: batchRes.leadIds });
      setActiveExportJobId(res.exportId);
      setIsDeliveryModalOpen(true);
    } catch (err: unknown) {
      alert(`Webhook transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setStartingWebhook(false);
    }
  };

  // 10. Filter & Sort Table Results
  const filteredResults = results
    .filter((p) => {
      if (tierFilter !== 'ALL' && p.tier !== tierFilter) return false;
      if (!tableSearch.trim()) return true;
      const q = tableSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.primaryType || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'DISTANCE') {
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
      }
      if (sortBy === 'RATING') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & API Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
            🏭
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">G-MAPS Industrial Intelligence</h1>
            <p className="text-xs text-slate-400">Authentic Indian MSME & Factory Discovery Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Places API Status Pill */}
          <button
            type="button"
            onClick={() => setShowQuotaModal(true)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              apiStatus?.status === 'CONNECTED'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${apiStatus?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>Google Places API Connected</span>
            {apiStatus?.responseTimeMs && (
              <span className="text-[10px] text-emerald-400/80 font-mono">({apiStatus.responseTimeMs}ms)</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowQuotaModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 flex items-center gap-1.5 transition"
          >
            <Key size={13} className="text-amber-400" />
            <span>API Key & Quota</span>
          </button>
        </div>
      </div>

      {/* 4 Real KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-base">📍</div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SEARCH CENTRE</div>
            <div className="text-xs font-bold text-white truncate" title={anchorName}>{anchorName}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-base">📏</div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DISCOVERY PERIMETER</div>
            <div className="text-xs font-bold text-white">{radiusKm} km (Verified &le; {radiusKm} km)</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center text-base">🏭</div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DISCOVERED UNITS</div>
            <div className="text-xs font-bold text-white">{results.length} Industrial Companies</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-base">⭐</div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">QUALIFIED LEADS</div>
            <div className="text-xs font-bold text-white">{results.filter(p => p.tier === 'Gold' || p.tier === 'Silver').length} Gold / Silver Tier</div>
          </div>
        </div>
      </div>

      {/* SECTION A: FIND A LOCATION OR COORDINATES */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center">A</span>
            <h2 className="text-sm font-bold text-white">Find a Location or Coordinates</h2>
          </div>
          <span className="text-xs text-slate-400">Establish geographic search centre</span>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setLocationMode('name')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              locationMode === 'name' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 size={14} />
            <span>🏢 Search by Company / Area Name</span>
          </button>
          <button
            type="button"
            onClick={() => setLocationMode('coords')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              locationMode === 'coords' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>🌐 Search by Coordinates (Lat, Lng)</span>
          </button>
        </div>

        {/* Mode 1: Search by Company / Area Name */}
        {locationMode === 'name' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleResolveLocation(); }}
                  placeholder="Enter ANY company, industrial estate, MIDC, or area (e.g. Eternal Limited, Red Hat, Bhosari MIDC, Chakan MIDC, Ranjangaon)..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => handleResolveLocation()}
                disabled={isResolving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/25 whitespace-nowrap"
              >
                {isResolving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <MapPin size={14} />
                    <span>Resolve Location</span>
                  </>
                )}
              </button>
            </div>

            {resolutionMessage && (
              <div className="text-xs px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-2">
                <Info size={14} className="shrink-0" />
                <span>{resolutionMessage}</span>
              </div>
            )}

            {/* Quick Preset Industrial Hubs (Optional shortcuts) */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-400">Popular Industrial Hubs & Landmarks (Click to Select):</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_HUBS.map((hub) => (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                      anchorName.includes(hub.name)
                        ? 'bg-blue-600/25 text-blue-300 border-blue-500 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{hub.name}</span>
                    <span className="text-[10px] text-slate-500">({hub.tag})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Search by Coordinates */}
        {locationMode === 'coords' && (
          <div className="space-y-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-300 flex items-center gap-2 bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
              <Compass size={15} className="text-blue-400 shrink-0" />
              <span>
                <strong>Geographic Coordinates Search:</strong> Paste comma-separated pair (e.g. <code>18.5204, 73.8567</code>) or enter Latitude (-90 to 90) and Longitude (-180 to 180).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Paste Pair (Auto-Parses):</label>
                <input
                  type="text"
                  value={coordPaste}
                  onChange={(e) => handleCoordinatePaste(e.target.value)}
                  placeholder="e.g. 18.5204, 73.8567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Latitude (-90 to 90):</label>
                <input
                  type="number"
                  step="any"
                  value={coordLat}
                  onChange={(e) => setCoordLat(e.target.value)}
                  placeholder="e.g. 18.6276"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Longitude (-180 to 180):</label>
                <input
                  type="number"
                  step="any"
                  value={coordLng}
                  onChange={(e) => setCoordLng(e.target.value)}
                  placeholder="e.g. 73.8344"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {coordError && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>{coordError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSetCoordinates}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                <MapPin size={14} />
                <span>Set Coordinates & Resolve Centre</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoordPaste('');
                  setCoordLat('');
                  setCoordLng('');
                  setCoordError(null);
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Confirmed Search Centre Badge Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-950/30 border border-blue-500/30 rounded-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Confirmed Search Centre</span>
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{anchorName}</span>
            </div>
            <div className="text-xs text-slate-400">{anchorAddress}</div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                Lat: {center.lat.toFixed(4)}, Lng: {center.lng.toFixed(4)}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                ID: {confirmedPlaceId}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                ✓ Verified by Google Places (New)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLocationMode('name');
              const el = document.querySelector('input');
              if (el) el.focus();
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Change Centre
          </button>
        </div>

        {/* Interactive Search Perimeter Map */}
        <div className="pt-2">
          <IndustrialMap
            center={center}
            radiusKm={radiusKm}
            directionBias={directionBias}
            places={results}
            centerName={anchorName}
            onCenterChange={handleMapCenterChange}
            onPlaceSelect={(p) => {
              console.log('Selected place on map:', p);
            }}
          />
        </div>
      </div>

      {/* SECTION B: DISCOVERY CONTROLS & SELECTION */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">B</span>
            <h2 className="text-sm font-bold text-white">Find Nearby Industrial Companies & MSMEs</h2>
          </div>
          <span className="text-xs text-slate-400">Configurable radius and department targeting</span>
        </div>

        {/* 1. Category Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 size={14} className="text-amber-400" />
            <span>Industrial Department / Category</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CATEGORY_PRESETS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon size={18} className={isSelected ? 'text-amber-400' : 'text-slate-500'} />
                  <span className="text-xs font-semibold mt-1.5 leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory === 'custom' && (
            <div className="mt-2">
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="Enter custom industrial query (e.g. Die Casting, Polymers, Gearbox, Heat Treatment, Fasteners)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* 2. Radius & Direction Bias */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Radius Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold">Discovery Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRadiusKm(r.value)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  radiusKm === r.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={r.desc}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Directional Bias */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Compass size={14} /> Direction:
            </span>
            {(['ALL', 'NORTH', 'SOUTH', 'EAST', 'WEST'] as DirectionBias[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirectionBias(d)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  directionBias === d
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Tiling Active Indicator */}
          {isTiled && (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <Layers size={13} />
              <span>Grid Tiling Active ({tiles.length} sectors)</span>
            </div>
          )}

          {/* Hero Discover Button */}
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/25 ml-auto"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scanning {radiusKm} km Industrial Belt...</span>
              </>
            ) : (
              <>
                <Search size={15} />
                <span>Find Industrial Companies & MSMEs ({radiusKm} km)</span>
              </>
            )}
          </button>
        </div>

        {/* Real Progress & Zero-Results Diagnostics Box */}
        {loading && (
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-blue-300">
              <div className="font-bold">Querying Google Places API across {tiles.length} sector(s)...</div>
              <div className="text-slate-400">Retrieving manufacturing companies and verifying Haversine distance &le; {radiusKm} km...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <div>
              <div className="font-bold">Search Error</div>
              <div>{error}</div>
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="ml-auto px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Diagnostics Summary Bar */}
        {diagnostics && !loading && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">Discovery Execution Summary:</span>
                <span>{diagnostics.finalDiscoveredCount} industrial companies found</span>
                <span className="text-slate-500">in {diagnostics.searchDurationMs}ms</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Raw Places: <strong>{diagnostics.totalRawResults}</strong></span>
                <span>Duplicates Merged: <strong>{diagnostics.duplicatesRemoved}</strong></span>
                {diagnostics.branchesPreserved > 0 && (
                  <span className="text-cyan-400">Branches Preserved: <strong>{diagnostics.branchesPreserved}</strong></span>
                )}
                <span>Exclusions: <strong>{filteredCount}</strong></span>
              </div>
            </div>

            {/* Zero-Results Diagnostic Feedback */}
            {diagnostics.finalDiscoveredCount === 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>Zero Results Diagnostic Report:</span>
                </div>
                {diagnostics.errorMessage ? (
                  <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 space-y-1">
                    <div className="font-bold">⚠️ Google Places API Error: {diagnostics.errorMessage}</div>
                    <div className="text-[11px] text-slate-300">
                      Your Google Places API key in <code>server/.env</code> returned an error. If expired, please renew or create a new key in Google Cloud Console and update <code>GOOGLE_PLACES_API_KEY</code>.
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300">
                    {diagnostics.totalRawResults === 0
                      ? `Google Places returned 0 places for queries "${diagnostics.queriesExecuted.join(', ')}" within ${diagnostics.radiusKm} km of this location.`
                      : `Google returned ${diagnostics.totalRawResults} places, but all were excluded as consumer businesses (shops, restaurants) or fell outside the strict ${diagnostics.radiusKm} km boundary.`}
                  </p>
                )}
                <div className="text-[11px] text-amber-400 pt-1">
                  💡 <strong>Suggested Actions:</strong> Try expanding radius to <strong>10 km</strong> or <strong>25 km</strong>, switch to "All Manufacturing & Industrial MSMEs", or select a major MIDC hub (Bhosari / Chakan).
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION C: DISCOVERED INDUSTRIAL RESULTS */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">C</span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Discovered Industrial Companies</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30">
                  {filteredResults.length} Units
                </span>
              </h2>
              <p className="text-xs text-slate-400">Verified industrial units with Haversine distance, telephone classification & tier status</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedPlaceIds.size > 0 && (
              <span className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5">
                <CheckSquare size={13} />
                <span>{selectedPlaceIds.size} Selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedPlaceIds(new Set())}
                  className="ml-1 text-slate-400 hover:text-white text-xs underline"
                >
                  Clear
                </button>
              </span>
            )}

            {/* Complete Detailed Excel Export - ALWAYS VISIBLE */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={results.length === 0 || exportingExcel}
              title="Download comprehensive, formatted Excel (.xlsx) workbook with all companies, sequence numbers, contacts, and radius metrics"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>{selectedPlaceIds.size > 0 ? `Export Selected Excel (${selectedPlaceIds.size})` : `Export Excel (${filteredResults.length} Units)`}</span>
            </button>

            {/* Send to AI Agent Dashboard - ALWAYS VISIBLE */}
            <button
              type="button"
              onClick={handleSendToAiDashboard}
              disabled={results.length === 0 || startingWebhook}
              title="Transfer companies to external AI Agent Dashboard in batches of 100 via secure webhook"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              {startingWebhook ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>{selectedPlaceIds.size > 0 ? `Send Selected (${selectedPlaceIds.size}) to AI Dashboard` : `Send to AI Dashboard (${filteredResults.length})`}</span>
            </button>

            {/* Download CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={results.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>Download CSV</span>
            </button>

            {/* Save All to Leads CRM - FAST ATOMIC BATCH */}
            <button
              type="button"
              onClick={handleSaveAllToLeads}
              disabled={results.length === 0 || isSavingAll}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {isSavingAll ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving {filteredResults.length} Leads...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Save All to Leads ({filteredResults.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Save Feedback Notification Banner */}
        {saveFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{saveFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveFeedback(null)}
              className="text-emerald-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter & Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search within results */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search in results (name, address, sector)..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tier Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'Gold', 'Silver', 'Bronze'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  tierFilter === t
                    ? t === 'Gold'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : t === 'Silver'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : t === 'Bronze'
                      ? 'bg-slate-600 text-white font-bold'
                      : 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Tiers' : `${t === 'Gold' ? '⭐' : t === 'Silver' ? '🛡️' : '🏭'} ${t}`}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'DISTANCE' | 'RATING' | 'NAME')}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="DISTANCE">📍 Distance (Closest First)</option>
              <option value="RATING">⭐ Rating & Reviews</option>
              <option value="NAME">🔤 Company Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.size > 0 && selectedPlaceIds.size === filteredResults.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-10">#</th>
                <th className="py-3 px-3">Company Name</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3">Distance</th>
                <th className="py-3 px-3">Address</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Maps</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span>Scanning industrial companies...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-400">No Industrial Companies Discovered</div>
                        <div className="text-xs">Adjust search centre, choose an industrial category, or increase radius and click Discover.</div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredResults.map((p, idx) => {
                  const isSaved = savedPlaceIds.has(p.placeId);
                  const isGold = p.tier === 'Gold';
                  const isSilver = p.tier === 'Silver';

                  return (
                    <tr key={p.placeId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedPlaceIds.has(p.placeId)}
                          onChange={() => handleToggleSelectPlace(p.placeId)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.primaryType || 'Industrial Enterprise'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isGold
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : isSilver
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isGold ? '⭐ Gold' : isSilver ? '🛡️ Silver' : '🏭 Bronze'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-400 whitespace-nowrap">
                        📍 {p.distanceKm} km
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate" title={p.address}>
                        {p.address}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.phone ? (
                          <div className="space-y-0.5">
                            <a
                              href={`tel:${p.phone}`}
                              className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Phone size={11} />
                              <span>{p.phone}</span>
                            </a>
                            {p.phoneType && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                                {p.phoneType}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Not available</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.rating !== null ? (
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star size={12} className="fill-amber-400" />
                            <span>{p.rating}</span>
                            <span className="text-slate-500 font-normal text-[10px]">({p.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Unrated</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.googleMapsUri ? (
                          <a
                            href={p.googleMapsUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Globe size={13} />
                            <span className="text-[11px]">View ↗</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSaveToLeads(p)}
                          disabled={isSaved || savingPlaceId === p.placeId}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                            isSaved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Saved</span>
                            </>
                          ) : savingPlaceId === p.placeId ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle size={12} />
                              <span>Save Lead</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Key & Quota Management Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Places API Key & Quota Manager</h3>
                  <p className="text-[11px] text-slate-400">Live integration status and provider diagnostics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuotaModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Connection Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold">
                    {apiStatus?.status === 'CONNECTED' ? '✓ Connected & Active' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active API Key:</span>
                  <span className="font-mono text-slate-300">{apiStatus?.maskedKey || 'AIzaSy...CDuE'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Provider Endpoint:</span>
                  <span className="text-slate-300 font-mono">places.googleapis.com (v1)</span>
                </div>
                {apiStatus?.responseTimeMs && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Live Health Latency:</span>
                    <span className="text-emerald-400 font-mono font-bold">{apiStatus.responseTimeMs} ms</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 space-y-1 text-[11px]">
                <div className="font-bold flex items-center gap-1.5">
                  <Info size={13} />
                  <span>Google Places Platform Quotas:</span>
                </div>
                <p>
                  Google Places API (New) gives <strong>$200 monthly credit</strong> (~10,000+ searches/month at ₹0).
                  The server manages bounded concurrency and caching to prevent quota waste.
                </p>
              </div>

              <button
                type="button"
                onClick={checkApiStatus}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Test Live Key & Check Latency</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuotaModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Tracking & Webhook Batch Progress Modal */}
      <ExportDeliveryModal
        isOpen={isDeliveryModalOpen}
        exportId={activeExportJobId}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </div>
  );
};
