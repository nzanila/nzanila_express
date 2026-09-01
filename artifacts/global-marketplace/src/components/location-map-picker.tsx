import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, ArrowLeft, MapPin, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  onClose?: () => void;
  height?: string;
}

// Fixed pin in center of map
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
  useMapEvents({
    moveend() {
      const map = useMap();
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    },
  });
  return null;
}

// Map view updater
function MapViewUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationMapPicker({
  onLocationSelect,
  initialLat = -3.3731,
  initialLng = 29.3644,
  onClose,
  height = '400px'
}: LocationMapPickerProps) {
  const { locale } = useLocale();
  const [mapCenter, setMapCenter] = useState({ lat: initialLat, lng: initialLng });
  const [mapZoom, setMapZoom] = useState(15);
  const [isMoving, setIsMoving] = useState(false);
  const [approximateAddress, setApproximateAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout>();

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': locale } }
      );
      const data = await res.json();
      setApproximateAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      setApproximateAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, [locale]);

  // Handle map move end
  const handleMapMoveEnd = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setIsMoving(false);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
      onLocationSelect(lat, lng);
    }, 500);
  }, [reverseGeocode, onLocationSelect]);

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
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Burundi')}&format=json&limit=5`,
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
    onLocationSelect(lat, lng);
  };

  // Use current location
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMapZoom(17);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          onLocationSelect(pos.coords.latitude, pos.coords.longitude);
          setSearching(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setSearching(false);
        }
      );
    }
  };

  return (
    <div className="relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-2 right-2 z-[1001] bg-white rounded-full p-2 shadow-lg hover:bg-gray-100">
          <X size={20} />
        </button>
      )}

      {/* Search bar */}
      <div className="relative z-[1001] px-2 py-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === 'fr' ? 'Rechercher un lieu...' : locale === 'rn' ? 'Rondera ahantu...' : locale === 'sw' ? 'Tafuta mahali...' : 'Search for a place...'}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
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
          <div className="absolute left-2 right-2 top-full mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto z-[1002]">
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => selectSearchResult(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                <p className="text-xs text-gray-700">{result.display_name.split(',').slice(0, 3).join(',')}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use current location button */}
      <button
        onClick={useCurrentLocation}
        className="absolute top-16 left-2 z-[1001] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg hover:bg-gray-50 border border-gray-200"
      >
        <Crosshair size={14} className="text-[#1a5f4a]" />
        {searching ? '...' : (locale === 'fr' ? 'Ma position' : locale === 'rn' ? 'Aho niriho' : locale === 'sw' ? 'Eneo langu' : 'My location')}
      </button>

      {/* Map with fixed pin */}
      <div className="relative" style={{ height }}>
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

      {/* Address display */}
      <div className="px-2 py-2 bg-white border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Location</p>
        {approximateAddress ? (
          <p className="text-xs font-medium text-gray-700 line-clamp-2">{approximateAddress}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">
            {locale === 'fr' ? 'Déplacez la carte pour définir la position' : 'Move the map to set location'}
          </p>
        )}
      </div>
    </div>
  );
}

// Modal version
interface LocationMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export function LocationMapPickerModal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng
}: LocationMapPickerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Select Location on Map</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <LocationMapPicker
            onLocationSelect={onLocationSelect}
            initialLat={initialLat}
            initialLng={initialLng}
            height="500px"
          />
        </div>
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">
            Move the map until the pin is at the correct place. Use search or GPS for best results.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
