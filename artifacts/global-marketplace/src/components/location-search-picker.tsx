import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, ArrowLeft, MapPin, X, Check } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');

interface LocationSearchPickerProps {
  onConfirm: (data: LocationData) => void;
  onCancel: () => void;
  mode?: 'buyer' | 'seller';
  initialLat?: number;
  initialLng?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  approximateAddress: string;
  locationName: string;
  province: string;
  commune: string;
  zone: string;
  landmark: string;
  directions: string;
  phone: string;
  meetAtPublicLandmark: boolean;
}

// Fixed pin in center of map - map moves underneath
function FixedPinOverlay() {
  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
      <div className="relative">
        <MapPin size={40} className="text-red-600 drop-shadow-lg" fill="currentColor" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rounded-full opacity-30" />
      </div>
    </div>
  );
}

// Map movement handler
function MapMoveHandler({ onMoveEnd }: { onMoveEnd: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    },
  });
  return null;
}

// Map view updater when searching
function MapViewUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

// Search result item
interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export function LocationSearchPicker({
  onConfirm,
  onCancel,
  mode = 'buyer',
  initialLat = -3.3731,
  initialLng = 29.3644,
}: LocationSearchPickerProps) {
  const { locale, tr } = useLocale();
  const [phase, setPhase] = useState<'search' | 'confirm-address'>('search');

  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: initialLat, lng: initialLng });
  const [mapZoom, setMapZoom] = useState(15);
  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // Reverse geocode state
  const [approximateAddress, setApproximateAddress] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Address form state
  const [locationName, setLocationName] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [zone, setZone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [directions, setDirections] = useState('');
  const [phone, setPhone] = useState('');
  const [meetAtPublicLandmark, setMeetAtPublicLandmark] = useState(false);

  // Location data from API
  const [provinces, setProvinces] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  // Fetch provinces on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/profiles/locations/provinces`)
      .then(r => r.json())
      .then(setProvinces)
      .catch(console.error);
  }, []);

  // Fetch communes when province changes
  useEffect(() => {
    if (province) {
      const prov = provinces.find(p => p.name === province);
      if (prov) {
        fetch(`${API_BASE}/api/profiles/locations/provinces/${prov.id}/communes`)
          .then(r => r.json())
          .then(data => { setCommunes(data); setCommune(''); setZone(''); })
          .catch(console.error);
      }
    } else {
      setCommunes([]);
      setZones([]);
    }
  }, [province, provinces]);

  // Fetch zones when commune changes
  useEffect(() => {
    if (commune) {
      const comm = communes.find(c => c.name === commune);
      if (comm) {
        fetch(`${API_BASE}/api/profiles/locations/communes/${comm.id}/zones`)
          .then(r => r.json())
          .then(data => { setZones(data); setZone(''); })
          .catch(console.error);
      }
    } else {
      setZones([]);
    }
  }, [commune, communes]);

  // Search with Nominatim
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Burundi')}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': locale } }
      );
      const data = await res.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setSearching(false);
  }, [locale]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Select search result
  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMapCenter({ lat, lng });
    setMapZoom(17);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    setApproximateAddress(result.display_name);
  };

  // Reverse geocode when map stops moving
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': locale } }
      );
      const data = await res.json();
      setApproximateAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      setApproximateAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
    setReverseGeocoding(false);
  }, [locale]);

  // Handle map move end
  const handleMapMoveEnd = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setIsMoving(false);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 500);
  }, [reverseGeocode]);

  // Handle map move start
  const handleMapMoveStart = useCallback(() => {
    setIsMoving(true);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
  }, []);

  // Use current location - auto-fills everything
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapCenter({ lat, lng });
          setMapZoom(17);

          // Reverse geocode to get full address
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': locale } }
            );
            const data = await res.json();
            const addr = data.address || {};
            setApproximateAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);

            // Auto-fill province/commune/zone from address
            const state = addr.state || addr.county || '';
            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';

            // Try to match with our API data
            if (provinces.length > 0) {
              const matchedProvince = provinces.find(p =>
                state.toLowerCase().includes(p.name.toLowerCase()) ||
                p.name.toLowerCase().includes(state.toLowerCase())
              );
              if (matchedProvince) {
                setProvince(matchedProvince.name);
                // Fetch communes for this province
                try {
                  const commRes = await fetch(`${API_BASE}/api/profiles/locations/provinces/${matchedProvince.id}/communes`);
                  const communesData = await commRes.json();
                  setCommunes(communesData);

                  const matchedCommune = communesData.find(c =>
                    city.toLowerCase().includes(c.name.toLowerCase()) ||
                    c.name.toLowerCase().includes(city.toLowerCase())
                  );
                  if (matchedCommune) {
                    setCommune(matchedCommune.name);
                    // Fetch zones
                    try {
                      const zoneRes = await fetch(`${API_BASE}/api/profiles/locations/communes/${matchedCommune.id}/zones`);
                      const zonesData = await zoneRes.json();
                      setZones(zonesData);

                      const matchedZone = zonesData.find(z =>
                        suburb.toLowerCase().includes(z.name.toLowerCase()) ||
                        z.name.toLowerCase().includes(suburb.toLowerCase())
                      );
                      if (matchedZone) setZone(matchedZone.name);
                    } catch {}
                  }
                } catch {}
              }
            }

            // Auto-set location name and skip to confirm
            setLocationName('GPS Location');
            setSearching(false);
            // Go directly to confirm phase with pre-filled data
            setPhase('confirm-address');
          } catch {
            setApproximateAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setLocationName('GPS Location');
            setSearching(false);
            setPhase('confirm-address');
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          setSearching(false);
        }
      );
    }
  };

  // Confirm pin location
  const confirmPin = () => {
    setPhase('confirm-address');
  };

  // Save address
  const saveAddress = () => {
    onConfirm({
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      approximateAddress,
      locationName,
      province,
      commune,
      zone,
      landmark,
      directions,
      phone,
      meetAtPublicLandmark,
    });
  };

  // When GPS auto-filled, only require landmark. Otherwise require all fields.
  const isGpsAutoFilled = locationName === 'GPS Location';
  const isAddressValid = isGpsAutoFilled
    ? landmark.trim() && phone.trim()
    : locationName.trim() && province && commune && zone && landmark.trim() && phone.trim();

  // Search phase
  if (phase === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-800">
              {mode === 'seller' ? 'Shop Location' : 'Delivery Location'}
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'seller' ? 'Where is your shop or pickup location?' : 'Where should we deliver?'}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative z-[1001] px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'fr' ? 'Rechercher un lieu, rue, quartier...' : locale === 'rn' ? 'Rondera ahantu, irozwi, zone...' : locale === 'sw' ? 'Tafuta mahali, barabara, eneo...' : 'Search a place, street, quartier...'}
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-gray-200">
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto z-[1002]">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => selectSearchResult(result)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{result.display_name.split(',').slice(0, 2).join(',')}</p>
                    <p className="text-xs text-gray-500">{result.display_name.split(',').slice(2).join(',').trim()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && searching && (
            <div className="absolute left-4 right-4 top-full mt-1 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-lg z-[1002]">
              <p className="text-sm text-gray-500">Searching...</p>
            </div>
          )}
        </div>

        {/* Use current location button */}
        <button
          onClick={useCurrentLocation}
          className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-3 text-sm font-semibold text-gray-600 hover:border-[#1a5f4a] hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] transition-all"
        >
          <Crosshair size={18} />
          {locale === 'fr' ? 'Utiliser ma position' : locale === 'rn' ? 'Koresha aho niriho' : locale === 'sw' ? 'Tumia eneo langu' : 'Use my current location'}
        </button>

        {/* Map with fixed pin */}
        <div className="relative flex-1 mx-4 mt-3 rounded-xl overflow-hidden border border-gray-200">
          <FixedPinOverlay />
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapMoveHandler onMoveEnd={handleMapMoveEnd} />
            <MapViewUpdater lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} />
          </MapContainer>

          {/* Moving indicator */}
          {isMoving && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white">
              {locale === 'fr' ? 'Déplacez la carte...' : locale === 'rn' ? 'Siba karamu...' : locale === 'sw' ? 'Songesha ramani...' : 'Move the map...'}
            </div>
          )}
        </div>

        {/* Approximate address display */}
        <div className="mx-4 mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">
            {locale === 'fr' ? 'Position approximative' : locale === 'rn' ? 'Ahantu hasanzwe' : locale === 'sw' ? 'Eneo la karibu' : 'Approximate location'}
          </p>
          {reverseGeocoding ? (
            <p className="text-sm text-gray-400 italic">Loading...</p>
          ) : approximateAddress ? (
            <p className="text-sm font-medium text-gray-800">{approximateAddress}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {locale === 'fr' ? 'Déplacez la carte pour définir la position' : 'Move the map to set location'}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 py-4 space-y-2 bg-white border-t border-gray-100">
          <button
            onClick={confirmPin}
            disabled={!approximateAddress}
            className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40"
          >
            {locale === 'fr' ? 'Confirmer cette position' : locale === 'rn' ? 'Emeza aho' : locale === 'sw' ? 'Thibitisha eneo hili' : 'Confirm this location'}
          </button>
          <button
            onClick={onCancel}
            className="h-12 w-full rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-gray-300"
          >
            {locale === 'fr' ? 'Annuler' : locale === 'rn' ? 'Hagarika' : locale === 'sw' ? 'Ghairi' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  // Confirm address form phase
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <button onClick={() => setPhase('search')} className="rounded-lg p-1.5 hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-800">
            {mode === 'seller' ? 'Shop Details' : 'Delivery Address'}
          </h2>
          <p className="text-xs text-gray-500">{approximateAddress.split(',').slice(0, 2).join(',')}</p>
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Location summary card */}
        <div className="rounded-xl bg-[#1a5f4a]/5 border border-[#1a5f4a]/20 p-3">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-[#1a5f4a]" />
            <div>
              <p className="text-sm font-semibold text-gray-800">{approximateAddress.split(',').slice(0, 2).join(',')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Location name - only show if not GPS auto-filled */}
        {locationName !== 'GPS Location' && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              {locale === 'fr' ? 'Nom du lieu' : locale === 'rn' ? 'Izina ry\'ahantu' : locale === 'sw' ? 'Jina la eneo' : 'Location name'}
            </label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((name) => (
                <button
                  key={name}
                  onClick={() => setLocationName(name)}
                  className={`flex-1 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                    locationName === name
                      ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {name === 'Home' ? (locale === 'fr' ? 'Maison' : locale === 'rn' ? 'Umugo' : locale === 'sw' ? 'Nyumbani' : 'Home') :
                   name === 'Work' ? (locale === 'fr' ? 'Travail' : locale === 'rn' ? 'Akazi' : locale === 'sw' ? 'Kazi' : 'Work') :
                   (locale === 'fr' ? 'Autre' : locale === 'rn' ? 'Izindi' : locale === 'sw' ? 'Nyingine' : 'Other')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Province - only show if not GPS auto-filled */}
        {locationName !== 'GPS Location' && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              {tr('onboarding.province')}
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
            >
              <option value="">{locale === 'fr' ? 'Choisir la province' : locale === 'rn' ? 'Hitamwo intara' : locale === 'sw' ? 'Chagua mkoa' : 'Select Province'}</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Commune - only show if not GPS auto-filled */}
        {locationName !== 'GPS Location' && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              {tr('onboarding.city')}
            </label>
            <select
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              disabled={!province}
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 disabled:opacity-50"
            >
              <option value="">{locale === 'fr' ? 'Choisir la commune' : locale === 'rn' ? 'Hitamwo komine' : locale === 'sw' ? 'Chagua wilaya' : 'Select Commune'}</option>
              {communes.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Zone - only show if not GPS auto-filled */}
        {locationName !== 'GPS Location' && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              {tr('onboarding.zone')}
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              disabled={!commune}
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 disabled:opacity-50"
            >
              <option value="">{locale === 'fr' ? 'Choisir la zone' : locale === 'rn' ? 'Hitamwo zone' : locale === 'sw' ? 'Chagua eneo' : 'Select Zone'}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Landmark - always required */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            {locale === 'fr' ? 'Repère le plus proche' : locale === 'rn' ? 'Ibimenyetso biri hejuru' : locale === 'sw' ? 'Kivinjari kilicho karibu' : 'Nearest landmark'}
          </label>
          <input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder={locale === 'fr' ? 'ex. Près de l\'école' : locale === 'rn' ? 'urugero. Hejuru ishule' : locale === 'sw' ? 'mf. Karibu na shule' : 'e.g. Near a school'}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
          />
        </div>

        {/* Directions */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            {locale === 'fr' ? 'Directions pour la livraison' : locale === 'rn' ? 'Injira yo kugera' : locale === 'sw' ? 'Maelekezo ya uwasilishaji' : 'Directions for delivery'}
          </label>
          <textarea
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            placeholder={locale === 'fr' ? 'Expliquez comment vous trouver...' : locale === 'rn' ? 'Sobanura uko ushobora kubona...' : locale === 'sw' ? 'Eleza jinsi ya kukupata...' : 'Explain how to find you...'}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            {locale === 'fr' ? 'Numéro de téléphone' : locale === 'rn' ? 'Nomero yaTelefone' : locale === 'sw' ? 'Nambari ya simu' : 'Phone number'}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+257 XX XXX XXX"
            type="tel"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
          />
        </div>

        {/* Meet at public landmark */}
        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={meetAtPublicLandmark}
            onChange={(e) => setMeetAtPublicLandmark(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-[#1a5f4a] focus:ring-[#1a5f4a]"
          />
          <span className="text-sm font-medium text-gray-700">
            {locale === 'fr' ? 'Me rencontrer à un repère public' : locale === 'rn' ? 'Mbona kuri ibimenyetso biri'
              : locale === 'sw' ? 'Nikutane kwenye kivinjari cha umma' : 'Meet me at a public landmark instead'}
          </span>
        </label>
      </div>

      {/* Save button */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        {isGpsAutoFilled && (
          <p className="text-xs text-gray-500 text-center mb-2">
            {locale === 'fr' ? 'Emplacement détecté par GPS. Ajoutez un repère pour aider le livreur.' : locale === 'rn' ? 'Ahantu yakiriwe na GPS. Ongerera ibimenyetso kugira umufasha.' : locale === 'sw' ? 'Eneo liligunduliwa na GPS. Ongeza kivinjari kusaidia msafirishaji.' : 'Location detected by GPS. Add a landmark to help the delivery person find you.'}
          </p>
        )}
        <button
          onClick={saveAddress}
          disabled={!isAddressValid}
          className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40"
        >
          {locale === 'fr' ? 'Enregistrer l\'adresse' : locale === 'rn' ? 'Bika ahantu' : locale === 'sw' ? 'Hifadhi anwani' : 'Save delivery location'}
        </button>
      </div>
    </div>
  );
}
