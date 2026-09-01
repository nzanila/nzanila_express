import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';

// Fix for default marker icons in Leaflet
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

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to update map view when location changes
function MapViewUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationMapPicker({ 
  onLocationSelect, 
  initialLat = -3.364, 
  initialLng = 29.367, // Bujumbura coordinates
  onClose,
  height = '400px'
}: LocationMapPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-[1000] bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      )}
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={13}
        style={{ height, width: '100%', borderRadius: '8px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        {position && (
          <>
            <Marker position={position} />
            <MapViewUpdater lat={position[0] as number} lng={position[1] as number} />
          </>
        )}
      </MapContainer>
      <div className="mt-2 text-sm text-muted-foreground">
        {position ? (
          <p>Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
        ) : (
          <p>Click on the map to select your location</p>
        )}
      </div>
    </div>
  );
}

// Modal version for better UX
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
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
            Click anywhere on the map to pin your exact location. This will help sellers/couriers find you more easily.
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
