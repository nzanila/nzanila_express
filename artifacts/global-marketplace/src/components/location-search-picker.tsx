import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, ArrowLeft, MapPin, X, Check, Navigation, ChevronRight, Home, Briefcase, HelpCircle } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { autoFillAddress } from '@/lib/location-utils';

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
  landmarkPhoto: string;
  directions: string;
  phone: string;
  meetAtPublicLandmark: boolean;
}

// Animated pin overlay
function AnimatedPin() {
  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
      <div className="relative animate-bounce" style={{ animationDuration: '2s' }}>
        <div className="absolute -inset-4 bg-[#ff6a00]/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="relative">
          <MapPin size={48} className="text-[#ff6a00] drop-shadow-2xl" fill="currentColor" strokeWidth={0} />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-sm" />
        </div>
      </div>
    </div>
  );
}

// Map movement handler - skips programmatic moves
function MapMoveHandler({ onMoveEnd, isMovingRef }: { onMoveEnd: (lat: number, lng: number) => void; isMovingRef: React.MutableRefObject<boolean> }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      if (isMovingRef.current) return;
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, onMoveEnd, isMovingRef]);
  return null;
}

// Map view updater - marks movement as programmatic
function MapViewUpdater({ lat, lng, zoom, isMovingRef }: { lat: number; lng: number; zoom?: number; isMovingRef: React.MutableRefObject<boolean> }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      isMovingRef.current = true;
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
      setTimeout(() => { isMovingRef.current = false; }, 100);
    }
  }, [lat, lng, zoom, map, isMovingRef]);
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
  const isProgrammaticMoveRef = useRef(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // Reverse geocode state
  const [approximateAddress, setApproximateAddress] = useState('');

  // Address form state
  const [locationName, setLocationName] = useState('');
  const [freeProvince, setFreeProvince] = useState('');
  const [freeCommune, setFreeCommune] = useState('');
  const [freeZone, setFreeZone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [landmarkPhoto, setLandmarkPhoto] = useState('');
  const [directions, setDirections] = useState('');
  const [phone, setPhone] = useState('');
  const [meetAtPublicLandmark, setMeetAtPublicLandmark] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
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

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Auto-detect location and fill available data
  const autoFillLocation = async (lat: number, lng: number) => {
    try {
      const result = await autoFillAddress(lat, lng, locale);
      console.log('Auto-fill result:', result);
      setFreeProvince(result.province);
      setFreeCommune(result.commune);
      setFreeZone(result.zone);
      setApproximateAddress(result.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (e) {
      console.error('Auto-fill error:', e);
      setApproximateAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const selectSearchResult = async (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMapCenter({ lat, lng });
    setMapZoom(17);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    await autoFillLocation(lat, lng);
  };

  const handleMapMoveEnd = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setIsMoving(false);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => {
      autoFillLocation(lat, lng);
    }, 500);
  }, [autoFillLocation]);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapCenter({ lat, lng });
          setMapZoom(17);
          await autoFillLocation(lat, lng);
          setLocationName(mode === 'seller' ? 'Shop' : 'Home');
          setSearching(false);
          setPhase('confirm-address');
        },
        (err) => {
          console.error('Geolocation error:', err);
          setSearching(false);
        }
      );
    }
  };

  const confirmPin = () => setPhase('confirm-address');

  const saveAddress = () => {
    onConfirm({
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      approximateAddress,
      locationName,
      province: freeProvince,
      commune: freeCommune,
      zone: freeZone,
      landmark,
      landmarkPhoto,
      directions,
      phone,
      meetAtPublicLandmark,
    });
  };

  // Only require what's available - landmark and phone always required
  const isAddressValid = locationName.trim() && phone.trim();

  // MAP SECTION (shared between both phases)
  const MapSection = ({ showOverlay = true }: { showOverlay?: boolean }) => (
    <div className="relative h-full w-full">
      <AnimatedPin />
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
        <MapMoveHandler onMoveEnd={handleMapMoveEnd} isMovingRef={isProgrammaticMoveRef} />
        <MapViewUpdater lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} isMovingRef={isProgrammaticMoveRef} />
      </MapContainer>

      {/* Moving indicator */}
      {isMoving && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-black/80 backdrop-blur-sm px-5 py-2 text-sm font-semibold text-white shadow-xl">
          {locale === 'fr' ? 'Déplacez la carte...' : locale === 'rn' ? 'Siba karamu...' : locale === 'sw' ? 'Songesha ramani...' : 'Move the map...'}
        </div>
      )}

      {/* Address overlay - desktop: top-left card, mobile: bottom card */}
      {showOverlay && (
        <div className="absolute top-4 left-4 right-4 md:right-auto md:max-w-sm z-[1000]">
          <div className="rounded-2xl bg-white shadow-xl p-4">
            {searching ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#ff6a00] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Detecting location...</p>
              </div>
            ) : approximateAddress ? (
              <div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-[#1a5f4a] p-2 flex-shrink-0">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{approximateAddress.split(',')[0]}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{approximateAddress.split(',').slice(1, 3).join(',')}</p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {locale === 'fr' ? 'Google Maps' : 'Google Maps'}
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                {locale === 'fr' ? 'Déplacez la carte pour définir la position' : 'Move the map to set location'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // SEARCH PHASE
  if (phase === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-white">
        {/* Mobile: vertical layout */}
        <div className="flex flex-col h-full md:hidden">
          {/* Mobile header */}
          <div className="bg-gradient-to-r from-[#1a5f4a] to-[#154a3a] px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={onCancel} className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors">
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  {mode === 'seller' ? 'Shop Location' : 'Delivery Location'}
                </h2>
                <p className="text-sm text-white/80">
                  {mode === 'seller' ? 'Where is your shop?' : 'Where should we deliver?'}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="px-4 py-3 bg-white border-b border-gray-100">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'fr' ? 'Rechercher un lieu...' : 'Search for a place...'}
                className="h-14 w-full rounded-2xl border-2 border-gray-100 bg-gray-50 pl-12 pr-12 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-gray-200">
                  <X size={18} className="text-gray-400" />
                </button>
              )}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 mt-2 rounded-2xl border border-gray-100 bg-white shadow-xl max-h-60 overflow-y-auto z-[1002]">
                {searchResults.map((result, i) => (
                  <button key={i} onClick={() => selectSearchResult(result)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <div className="mt-1 rounded-full bg-[#ff6a00]/10 p-2"><MapPin size={16} className="text-[#ff6a00]" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{result.display_name.split(',')[0]}</p>
                      <p className="text-xs text-gray-500 truncate">{result.display_name.split(',').slice(1, 3).join(',')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile location button */}
          <button onClick={useCurrentLocation}
            className="mx-4 mt-3 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff6a00] to-[#e55d00] py-3.5 text-base font-bold text-white shadow-lg shadow-[#ff6a00]/30 active:scale-[0.98] transition-all">
            <Navigation size={20} />
            {locale === 'fr' ? 'Ma position actuelle' : 'Use my current location'}
          </button>

          {/* Mobile map */}
          <div className="flex-1 mx-4 mt-3 rounded-2xl overflow-hidden border border-gray-200">
            <MapSection />
          </div>

          {/* Mobile confirm button */}
          <div className="px-4 py-4">
            <button onClick={confirmPin} disabled={!approximateAddress}
              className="h-14 w-full rounded-2xl bg-[#1a5f4a] text-lg font-bold text-white hover:bg-[#154a3a] disabled:opacity-40 shadow-lg active:scale-[0.98] transition-all">
              {locale === 'fr' ? 'Confirmer cette position' : 'Confirm this location'}
            </button>
          </div>
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="hidden md:flex h-full w-full">
          {/* Left: Search panel */}
          <div className="w-[420px] h-full flex flex-col border-r border-gray-200 bg-white">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={onCancel} className="rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors">
                  <ArrowLeft size={20} className="text-gray-700" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {mode === 'seller' ? 'Shop Location' : 'Delivery Location'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {mode === 'seller' ? 'Where is your shop?' : 'Where should we deliver?'}
                  </p>
                </div>
              </div>

              {/* Search bar with GPS button inside */}
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'fr' ? 'Rechercher un lieu, rue, quartier...' : 'Search a place, street, quartier...'}
                  className="h-14 w-full rounded-2xl border-2 border-gray-100 bg-gray-50 pl-12 pr-14 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all"
                />
                {searchQuery ? (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-gray-200 transition-colors">
                    <X size={18} className="text-gray-400" />
                  </button>
                ) : (
                  <button onClick={useCurrentLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#ff6a00] p-2 hover:bg-[#e55d00] transition-colors shadow-md"
                    title="Use my current location">
                    <Navigation size={18} className="text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Content area: results or instructions */}
            <div className="flex-1 overflow-y-auto">
              {/* Search results */}
              {showResults && searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((result, i) => (
                    <button key={i} onClick={() => selectSearchResult(result)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="mt-1 rounded-full bg-[#ff6a00]/10 p-2 flex-shrink-0">
                        <MapPin size={16} className="text-[#ff6a00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{result.display_name.split(',')[0]}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{result.display_name.split(',').slice(1, 3).join(',')}</p>
                      </div>
                      <ChevronRight size={16} className="mt-1 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : showResults && searching ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-8 h-8 border-3 border-[#ff6a00] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 mt-4">Searching places...</p>
                </div>
              ) : (
                /* Instructions when no search */
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff6a00]/10 to-[#ff6a00]/5 flex items-center justify-center mb-6">
                    <MapPin size={36} className="text-[#ff6a00]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {locale === 'fr' ? 'Trouvez votre adresse' : 'Find your address'}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-xs">
                    {locale === 'fr'
                      ? 'Recherchez un lieu ou utilisez votre position actuelle. Vous pourrez ensuite ajuster la position sur la carte.'
                      : 'Search for a place or use your current location. You can then adjust the pin on the map.'}
                  </p>
                  <button onClick={useCurrentLocation}
                    className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#ff6a00]/30 bg-[#ff6a00]/5 px-6 py-4 text-sm font-semibold text-[#ff6a00] hover:bg-[#ff6a00]/10 hover:border-[#ff6a00]/50 transition-all">
                    <Navigation size={20} />
                    {locale === 'fr' ? 'Utiliser ma position actuelle' : 'Use my current location'}
                  </button>
                </div>
              )}
            </div>

            {/* Confirm button at bottom */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={confirmPin} disabled={!approximateAddress}
                className="h-14 w-full rounded-2xl bg-[#1a5f4a] text-lg font-bold text-white hover:bg-[#154a3a] disabled:opacity-40 shadow-lg shadow-[#1a5f4a]/30 active:scale-[0.98] transition-all">
                {locale === 'fr' ? 'Confirmer cette position' : 'Confirm this location'}
              </button>
            </div>
          </div>

          {/* Right: Map */}
          <div className="flex-1 h-full">
            <MapSection />
          </div>
        </div>
      </div>
    );
  }

  // CONFIRM ADDRESS PHASE
  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-gray-50">
      {/* Mobile: vertical layout */}
      <div className="flex flex-col h-full md:hidden">
        {/* Mobile header */}
        <div className="bg-gradient-to-r from-[#1a5f4a] to-[#154a3a]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => setPhase('search')} className="rounded-full p-2 bg-white/10 hover:bg-white/20">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">
                {mode === 'seller' ? 'Shop Details' : 'Delivery Address'}
              </h2>
              <p className="text-sm text-white/80 truncate">{approximateAddress.split(',').slice(0, 2).join(',')}</p>
            </div>
          </div>
          <div className="h-28 mx-4 mb-4 rounded-2xl overflow-hidden shadow-lg relative">
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <MapPin size={32} className="text-[#ff6a00] drop-shadow-lg" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Mobile form */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          <MobileFormFields {...{ locationName, setLocationName, freeProvince, setFreeProvince, freeCommune, setFreeCommune, freeZone, setFreeZone, landmark, setLandmark, landmarkPhoto, setLandmarkPhoto, directions, setDirections, phone, setPhone, meetAtPublicLandmark, setMeetAtPublicLandmark, locale, tr }} />
        </div>

        {/* Mobile save */}
        <div className="px-4 py-4 bg-white border-t border-gray-100">
          <button onClick={saveAddress} disabled={!isAddressValid}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1a5f4a] to-[#154a3a] text-lg font-bold text-white disabled:opacity-40 shadow-lg active:scale-[0.98] transition-all">
            {locale === 'fr' ? 'Enregistrer l\'adresse' : 'Save location'}
          </button>
        </div>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex h-full w-full">
        {/* Left: Form */}
        <div className="w-[480px] h-full flex flex-col bg-white border-r border-gray-200">
          {/* Form header */}
          <div className="px-8 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button onClick={() => setPhase('search')} className="rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors">
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === 'seller' ? 'Shop Details' : 'Delivery Address'}
                </h2>
                <p className="text-sm text-gray-500 truncate">{approximateAddress.split(',').slice(0, 2).join(',')}</p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
            <DesktopFormFields {...{ locationName, setLocationName, freeProvince, setFreeProvince, freeCommune, setFreeCommune, freeZone, setFreeZone, landmark, setLandmark, landmarkPhoto, setLandmarkPhoto, directions, setDirections, phone, setPhone, meetAtPublicLandmark, setMeetAtPublicLandmark, locale, tr }} />
          </div>

          {/* Save button */}
          <div className="px-8 py-5 border-t border-gray-100">
            <button onClick={saveAddress} disabled={!isAddressValid}
              className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1a5f4a] to-[#154a3a] text-lg font-bold text-white disabled:opacity-40 shadow-lg shadow-[#1a5f4a]/30 active:scale-[0.98] transition-all">
              {locale === 'fr' ? 'Enregistrer l\'adresse' : 'Save location'}
            </button>
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 h-full relative">
          <MapSection showOverlay={false} />
          {/* Map bottom card */}
          <div className="absolute bottom-6 left-6 right-6 z-[1000]">
            <div className="rounded-2xl bg-white shadow-xl p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#1a5f4a] p-2"><MapPin size={16} className="text-white" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{approximateAddress.split(',')[0]}</p>
                  <p className="text-xs text-gray-500">{mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</p>
                </div>
                <a href={`https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                  Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MOBILE FORM FIELDS
function MobileFormFields({ locationName, setLocationName, freeProvince, setFreeProvince, freeCommune, setFreeCommune, freeZone, setFreeZone, landmark, setLandmark, landmarkPhoto, setLandmarkPhoto, directions, setDirections, phone, setPhone, meetAtPublicLandmark, setMeetAtPublicLandmark, locale, tr }: any) {
  return (
    <>
      {locationName !== 'GPS Location' && locationName !== 'Shop' && locationName !== 'Home' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="mb-3 block text-sm font-bold text-gray-800">
            {locale === 'fr' ? 'Nom du lieu' : 'Location name'}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'Home', icon: Home, label: locale === 'fr' ? 'Maison' : 'Home' },
              { key: 'Work', icon: Briefcase, label: locale === 'fr' ? 'Travail' : 'Work' },
              { key: 'Other', icon: HelpCircle, label: locale === 'fr' ? 'Autre' : 'Other' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setLocationName(key)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${locationName === key ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                <Icon size={24} className={locationName === key ? 'text-[#1a5f4a]' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${locationName === key ? 'text-[#1a5f4a]' : 'text-gray-600'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <LocationSelect label={tr('onboarding.province')} value={freeProvince} onChange={setFreeProvince} options={[]} placeholder={locale === 'fr' ? 'Province' : 'Province'} icon={<MapPin size={18} className="text-gray-400" />} locale={locale} />
      <LocationSelect label={tr('onboarding.city')} value={freeCommune} onChange={setFreeCommune} options={[]} placeholder={locale === 'fr' ? 'Commune / Ville' : 'Commune / City'} icon={<svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} locale={locale} />
      <LocationSelect label={tr('onboarding.zone')} value={freeZone} onChange={setFreeZone} options={[]} placeholder={locale === 'fr' ? 'Quartier / Zone' : 'Area / Zone'} icon={<svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} locale={locale} />
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Photo du repère' : 'Landmark photo'}</label>
        <p className="mb-3 text-xs text-gray-500">{locale === 'fr' ? 'Ajoutez une photo du repère proche (optionnel)' : 'Add a photo of a nearby landmark (optional)'}</p>
        <div className="relative">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => setLandmarkPhoto(ev.target?.result as string);
              reader.readAsDataURL(file);
            }
          }} className="hidden" id="landmark-photo-input" />
          <label htmlFor="landmark-photo-input" className="flex items-center justify-center gap-3 h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 transition-all">
            {landmarkPhoto ? (
              <img src={landmarkPhoto} alt="Landmark" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm text-gray-400">{locale === 'fr' ? 'Appuyez pour ajouter une photo' : 'Tap to add a photo'}</span>
              </>
            )}
          </label>
          {landmarkPhoto && (
            <button onClick={() => setLandmarkPhoto('')} className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Directions pour la livraison' : 'Directions for delivery'}</label>
        <textarea value={directions} onChange={(e) => setDirections(e.target.value)} placeholder={locale === 'fr' ? 'Expliquez comment vous trouver...' : 'How to find you...'} rows={3}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-4 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all resize-none" />
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Numéro de téléphone' : 'Phone number'} <span className="text-red-500">*</span></label>
        <div className="relative">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+257 XX XXX XXX" type="tel"
            className="h-14 w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all" />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="flex items-center gap-4 cursor-pointer">
          <div className={`relative w-14 h-8 rounded-full transition-colors ${meetAtPublicLandmark ? 'bg-[#1a5f4a]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${meetAtPublicLandmark ? 'translate-x-6' : ''}`} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-bold text-gray-800 block">{locale === 'fr' ? 'Me rencontrer à un repère public' : 'Meet me at a public landmark'}</span>
            <span className="text-xs text-gray-500 block">{locale === 'fr' ? 'Activez pour un lieu public' : 'Enable for a public place'}</span>
          </div>
          <input type="checkbox" checked={meetAtPublicLandmark} onChange={(e) => setMeetAtPublicLandmark(e.target.checked)} className="sr-only" />
        </label>
      </div>
    </>
  );
}

// DESKTOP FORM FIELDS
function DesktopFormFields({ locationName, setLocationName, freeProvince, setFreeProvince, freeCommune, setFreeCommune, freeZone, setFreeZone, landmark, setLandmark, landmarkPhoto, setLandmarkPhoto, directions, setDirections, phone, setPhone, meetAtPublicLandmark, setMeetAtPublicLandmark, locale, tr }: any) {
  return (
    <>
      {locationName !== 'GPS Location' && locationName !== 'Shop' && locationName !== 'Home' && (
        <div>
          <label className="mb-3 block text-sm font-bold text-gray-800">
            {locale === 'fr' ? 'Nom du lieu' : 'Location name'}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'Home', icon: Home, label: locale === 'fr' ? 'Maison' : 'Home' },
              { key: 'Work', icon: Briefcase, label: locale === 'fr' ? 'Travail' : 'Work' },
              { key: 'Other', icon: HelpCircle, label: locale === 'fr' ? 'Autre' : 'Other' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setLocationName(key)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${locationName === key ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                <Icon size={24} className={locationName === key ? 'text-[#1a5f4a]' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${locationName === key ? 'text-[#1a5f4a]' : 'text-gray-600'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <LocationSelect label={tr('onboarding.province')} value={freeProvince} onChange={setFreeProvince} options={[]} placeholder={locale === 'fr' ? 'Province' : 'Province'} icon={<MapPin size={18} className="text-gray-400" />} locale={locale} />
      <LocationSelect label={tr('onboarding.city')} value={freeCommune} onChange={setFreeCommune} options={[]} placeholder={locale === 'fr' ? 'Commune / Ville' : 'Commune / City'} icon={<svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} locale={locale} />
      <LocationSelect label={tr('onboarding.zone')} value={freeZone} onChange={setFreeZone} options={[]} placeholder={locale === 'fr' ? 'Quartier / Zone' : 'Area / Zone'} icon={<svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} locale={locale} />
      <div>
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Photo du repère' : 'Landmark photo'}</label>
        <p className="mb-3 text-xs text-gray-500">{locale === 'fr' ? 'Ajoutez une photo du repère proche (optionnel)' : 'Add a photo of a nearby landmark (optional)'}</p>
        <div className="relative">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => setLandmarkPhoto(ev.target?.result as string);
              reader.readAsDataURL(file);
            }
          }} className="hidden" id="landmark-photo-desktop" />
          <label htmlFor="landmark-photo-desktop" className="flex items-center justify-center gap-3 h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 transition-all">
            {landmarkPhoto ? (
              <img src={landmarkPhoto} alt="Landmark" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm text-gray-400">{locale === 'fr' ? 'Appuyez pour ajouter une photo' : 'Tap to add a photo'}</span>
              </>
            )}
          </label>
          {landmarkPhoto && (
            <button onClick={() => setLandmarkPhoto('')} className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Directions pour la livraison' : 'Directions for delivery'}</label>
        <textarea value={directions} onChange={(e) => setDirections(e.target.value)} placeholder={locale === 'fr' ? 'Expliquez comment vous trouver...' : 'How to find you...'} rows={3}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-4 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all resize-none" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold text-gray-800">{locale === 'fr' ? 'Numéro de téléphone' : 'Phone number'} <span className="text-red-500">*</span></label>
        <div className="relative">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+257 XX XXX XXX" type="tel"
            className="h-14 w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all" />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 p-5">
        <label className="flex items-center gap-4 cursor-pointer">
          <div className={`relative w-14 h-8 rounded-full transition-colors ${meetAtPublicLandmark ? 'bg-[#1a5f4a]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${meetAtPublicLandmark ? 'translate-x-6' : ''}`} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-bold text-gray-800 block">{locale === 'fr' ? 'Me rencontrer à un repère public' : 'Meet me at a public landmark'}</span>
            <span className="text-xs text-gray-500 block">{locale === 'fr' ? 'Activez pour un lieu public' : 'Enable for a public place'}</span>
          </div>
          <input type="checkbox" checked={meetAtPublicLandmark} onChange={(e) => setMeetAtPublicLandmark(e.target.checked)} className="sr-only" />
        </label>
      </div>
    </>
  );
}

// SHARED LOCATION SELECT - shows select if options exist, text input if not
function LocationSelect({ label, value, onChange, options, placeholder, disabled, icon, locale }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string; disabled?: boolean; icon: React.ReactNode; locale?: string }) {
  // If no options from DB, show text input
  if (!options || options.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-gray-800">{label}</label>
        <div className="relative">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="h-14 w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all" />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <label className="mb-2 block text-sm font-bold text-gray-800">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
          className="h-14 w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-10 text-base outline-none focus:border-[#ff6a00] focus:bg-white transition-all appearance-none disabled:opacity-50">
          <option value="">{placeholder}</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
}
