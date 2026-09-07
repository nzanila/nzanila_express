import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, MapPin, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { useLocale } from '../lib/i18n/locale-context';

export interface SellerLocation {
  latitude: number;
  longitude: number;
  address: string;
}

function CenterSync({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ moveend(event) { const center = event.target.getCenter(); onMove(center.lat, center.lng); } });
  return null;
}

function MoveMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  // Do not animate programmatic GPS/search jumps: the intermediate moveend
  // events can be mistaken for a manual drag and reset the selected source.
  useEffect(() => { map.setView(center, zoom, { animate: false }); }, [center, zoom, map]);
  return null;
}

function readableFallback(lat: number, lng: number) {
  // Keep the form useful even when a reverse-geocoder is temporarily
  // unavailable. These bounds cover Kigali's Gasabo area.
  if (lat > -2.05 && lat < -1.85 && lng > 30.05 && lng < 30.25) return 'Gasabo District, Kigali, Rwanda';
  return `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function SellerLocationMapModal({ isOpen, initial, onClose, onConfirm }: { isOpen: boolean; initial?: Partial<SellerLocation>; onClose: () => void; onConfirm: (location: SellerLocation) => void }) {
  const { tr } = useLocale();
  const [center, setCenter] = useState<[number, number]>([initial?.latitude ?? -1.9441, initial?.longitude ?? 30.0619]);
  const [address, setAddress] = useState(initial?.address || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedSource, setSelectedSource] = useState<'map' | 'gps' | 'search'>('map');
  const [satellite, setSatellite] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsMovePending = useRef(false);
  const gpsTarget = useRef<[number, number] | null>(null);
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error('Primary address lookup failed');
      const data = await response.json();
      if (!data.display_name) throw new Error('No primary address found');
      setAddress(data.display_name);
    } catch {
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (!response.ok) throw new Error('Backup address lookup failed');
        const data = await response.json();
        const administrative = Array.isArray(data.localityInfo?.administrative) ? data.localityInfo.administrative : [];
        const district = administrative.find((item: any) => /district/i.test(String(item.description || item.name || '')))?.name;
        const city = data.city || data.locality || data.principalSubdivision;
        const inferredDistrict = !district && data.countryName === 'Rwanda' && lat > -2.05 && lat < -1.85 && lng > 30.05 && lng < 30.25 ? 'Gasabo District' : district;
        const detected = [inferredDistrict, city, data.countryName].filter(Boolean).filter((item: string, index: number, all: string[]) => all.indexOf(item) === index).join(', ');
        setAddress(detected || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      } catch { setAddress(readableFallback(lat, lng)); }
    } finally { setGeocoding(false); }
  }, []);
  const updateCenter = useCallback((lat: number, lng: number) => { const target = gpsTarget.current; const isGpsMove = Boolean(target && Math.abs(target[0] - lat) < 0.002 && Math.abs(target[1] - lng) < 0.002); if (gpsMovePending.current) gpsMovePending.current = false; if (!isGpsMove) { gpsTarget.current = null; setSelectedSource('map'); } setCenter([lat, lng]); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void reverseGeocode(lat, lng), 350); }, [reverseGeocode]);
  useEffect(() => { if (isOpen) { const next: [number, number] = [initial?.latitude ?? -1.9441, initial?.longitude ?? 30.0619]; setCenter(next); setAddress(initial?.address || ''); if (initial?.latitude != null && initial?.longitude != null) void reverseGeocode(next[0], next[1]); } }, [isOpen]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const search = async () => { if (query.trim().length < 3) return; setSearching(true); try { const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`, { headers: { 'Accept-Language': 'en' } }); setResults(await response.json()); } finally { setSearching(false); } };
  const useCurrent = () => { setLocationError(''); if (!navigator.geolocation) { setLocationError('Location is not supported by this browser.'); return; } setLocating(true); navigator.geolocation.getCurrentPosition(position => { const lat = position.coords.latitude; const lng = position.coords.longitude; gpsMovePending.current = true; gpsTarget.current = [lat, lng]; setCenter([lat, lng]); setSelectedSource('gps'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void reverseGeocode(lat, lng), 350); setLocating(false); }, error => { setLocating(false); setLocationError(error.code === 1 ? 'Allow location access in your browser, then try again.' : 'Could not get your precise location. Search for the address instead.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#ff6a00]"><MapPin size={20} /></span><div><h2 className="font-bold text-gray-900">{tr('sc.set-the-exact-store-location')}</h2><p className="text-xs text-gray-500">{tr('sc.use-gps-search-an-address-or-move-the-map-un')}</p></div></div><button onClick={onClose} aria-label={tr("sc.close-location-map")} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button></div>
      <div className="relative h-[470px]">
        <div className="absolute left-4 right-4 top-4 z-[1000] flex gap-2"><div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void search(); }} placeholder={tr("sc.search-street-building-city-or-province")} className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-3 text-sm shadow-lg outline-none focus:border-[#ff6a00]" />{results.length > 0 && <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border bg-white shadow-xl">{results.map((result, index) => <button key={index} onClick={() => { setAddress(result.display_name); updateCenter(Number(result.lat), Number(result.lon)); setQuery(result.display_name.split(',')[0]); setResults([]); }} className="block w-full border-b px-4 py-3 text-left text-xs leading-4 hover:bg-orange-50">{result.display_name}</button>)}</div>}</div><button onClick={search} disabled={searching} className="rounded-lg bg-[#233548] px-5 text-sm font-bold text-white hover:bg-[#172535] disabled:opacity-50">{searching ? 'Searching…' : 'Search'}</button></div>
        <div className="absolute left-4 top-20 z-[1000] flex gap-2"><button onClick={useCurrent} disabled={locating || geocoding || selectedSource === 'gps'} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold shadow-lg hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"><Crosshair size={15} className="text-[#ff6a00]" /> {locating ? 'Finding precise location…' : geocoding ? 'Detecting address…' : selectedSource === 'gps' ? 'Current location selected' : 'Use my precise location'}</button><button type="button" onClick={() => setSatellite(value => !value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold shadow-lg hover:bg-orange-50">{satellite ? 'Map view' : 'Satellite'}</button></div>
        {locationError && <div className="absolute left-4 top-32 z-[1000] max-w-sm rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow">{locationError}</div>}
        <MapContainer center={center} zoom={selectedSource === 'gps' ? 19 : 15} style={{ height: '100%', width: '100%' }} zoomControl={true}>{satellite ? <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /> : <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}<CenterSync onMove={updateCenter} /><MoveMap center={center} zoom={selectedSource === 'gps' ? 19 : 15} /></MapContainer>
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center"><MapPin size={52} fill="#ff6a00" stroke="white" strokeWidth={2} className="-mt-7 drop-shadow-xl" /></div>
      </div>
      <div className="flex flex-col gap-4 border-t bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 sm:max-w-[62%]"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tr('sc.selected-address')}</p><p className="mt-1 text-sm font-semibold leading-5 text-gray-800">{geocoding ? (selectedSource === 'gps' ? 'Detecting your current address…' : 'Detecting the street and area…') : address || 'Move the map or use GPS to select the exact address.'}</p><p className="mt-1 text-[11px] text-gray-500">Coordinates: {center[0].toFixed(6)}, {center[1].toFixed(6)}</p><a href={`https://www.google.com/maps?q=${center[0]},${center[1]}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline">{tr('sc.verify-in-google-maps')}</a></div><div className="flex shrink-0 gap-2"><button onClick={onClose} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50">{tr('sc.cancel')}</button><button disabled={locating || (geocoding && selectedSource !== 'gps')} onClick={() => onConfirm({ latitude: center[0], longitude: center[1], address: address || readableFallback(center[0], center[1]) })} className="rounded-lg bg-[#ff6a00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-50">{locating ? 'Finding location…' : geocoding && selectedSource !== 'gps' ? 'Detecting address…' : 'Use this location'}</button></div></div>
    </div>
  </div>;
}
