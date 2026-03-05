import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Save, RotateCcw } from 'lucide-react';

interface MapRecord {
  id: string;
  title: string;
  bbox: string;
  west_long: number;
  east_long: number;
  north_lat: number;
  south_lat: number;
  adjusted: boolean;
  extraColumns: Record<string, string>;
}

interface MapViewerProps {
  record: MapRecord;
  onSave: (id: string, bounds: { west: number; east: number; north: number; south: number }) => void;
}

export function MapViewer({ record, onSave }: MapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [currentBounds, setCurrentBounds] = useState({
    west: record.west_long,
    east: record.east_long,
    north: record.north_lat,
    south: record.south_lat,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setCurrentBounds({
      west: record.west_long,
      east: record.east_long,
      north: record.north_lat,
      south: record.south_lat,
    });
    setHasChanges(false);
  }, [record]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current).setView([0, 0], 2);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    updateBoundingBox(currentBounds);

    const leafletBounds = L.latLngBounds(
      [currentBounds.south, currentBounds.west],
      [currentBounds.north, currentBounds.east]
    );
    map.fitBounds(leafletBounds, { padding: [30, 30] });

    return () => {
      Object.values(markersRef.current).forEach(marker => {
        if (mapRef.current) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current = {};
      if (rectangleRef.current && mapRef.current) {
        mapRef.current.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      updateBoundingBox(currentBounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBounds]);

  const updateBoundingBox = (bounds: typeof currentBounds) => {
    if (!mapRef.current) return;

    const leafletBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    );

    if (rectangleRef.current) {
      rectangleRef.current.setBounds(leafletBounds);
    } else {
      const rectangle = L.rectangle(leafletBounds, {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(mapRef.current);
      rectangleRef.current = rectangle;
    }

    const corners = [
      { lat: bounds.north, lng: bounds.west, name: 'NW' },
      { lat: bounds.north, lng: bounds.east, name: 'NE' },
      { lat: bounds.south, lng: bounds.west, name: 'SW' },
      { lat: bounds.south, lng: bounds.east, name: 'SE' },
    ];

    corners.forEach(corner => {
      if (markersRef.current[corner.name]) {
        markersRef.current[corner.name].setLatLng([corner.lat, corner.lng]);
      } else {
        const icon = L.divIcon({
          className: 'corner-marker',
          html: `<div style="width: 16px; height: 16px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: move;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([corner.lat, corner.lng], {
          icon,
          draggable: true,
        }).addTo(mapRef.current!);

        marker.on('dragstart', () => {
          isDraggingRef.current = true;
        });

        marker.on('drag', (e) => {
          const newLatLng = e.target.getLatLng();
          updateCornerDuringDrag(corner.name, newLatLng.lat, newLatLng.lng);
        });

        marker.on('dragend', (e) => {
          isDraggingRef.current = false;
          const newLatLng = e.target.getLatLng();
          updateCorner(corner.name, newLatLng.lat, newLatLng.lng);
        });

        markersRef.current[corner.name] = marker;
      }
    });
  };

  const updateCornerDuringDrag = (corner: string, lat: number, lng: number) => {
    if (!rectangleRef.current || !mapRef.current) return;

    // Read live bounds from Leaflet rather than React state to avoid stale closures —
    // marker event handlers are created once and would otherwise capture the initial state.
    const lb = rectangleRef.current.getBounds();
    const newBounds = {
      north: lb.getNorth(),
      south: lb.getSouth(),
      east: lb.getEast(),
      west: lb.getWest(),
    };

    switch (corner) {
      case 'NW':
        newBounds.north = lat;
        newBounds.west = lng;
        break;
      case 'NE':
        newBounds.north = lat;
        newBounds.east = lng;
        break;
      case 'SW':
        newBounds.south = lat;
        newBounds.west = lng;
        break;
      case 'SE':
        newBounds.south = lat;
        newBounds.east = lng;
        break;
    }

    const leafletBounds = L.latLngBounds(
      [newBounds.south, newBounds.west],
      [newBounds.north, newBounds.east]
    );
    rectangleRef.current.setBounds(leafletBounds);

    Object.keys(markersRef.current).forEach(key => {
      if (key === corner) return;
      const marker = markersRef.current[key];
      let newLat = marker.getLatLng().lat;
      let newLng = marker.getLatLng().lng;

      if (key.includes('N')) newLat = newBounds.north;
      if (key.includes('S')) newLat = newBounds.south;
      if (key.includes('W')) newLng = newBounds.west;
      if (key.includes('E') && !key.includes('W')) newLng = newBounds.east;

      marker.setLatLng([newLat, newLng]);
    });
  };

  const updateCorner = (corner: string, lat: number, lng: number) => {
    setCurrentBounds(prev => {
      const newBounds = { ...prev };

      switch (corner) {
        case 'NW':
          newBounds.north = lat;
          newBounds.west = lng;
          break;
        case 'NE':
          newBounds.north = lat;
          newBounds.east = lng;
          break;
        case 'SW':
          newBounds.south = lat;
          newBounds.west = lng;
          break;
        case 'SE':
          newBounds.south = lat;
          newBounds.east = lng;
          break;
      }

      return newBounds;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(record.id, currentBounds);
    setHasChanges(false);
  };

  const handleReset = () => {
    isDraggingRef.current = false;
    setCurrentBounds({
      west: record.west_long,
      east: record.east_long,
      north: record.north_lat,
      south: record.south_lat,
    });
    setHasChanges(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{record.title || record.id}</h2>
            {record.title && <p className="text-sm text-gray-600">{record.id}</p>}
          </div>
          {record.adjusted && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
              Adjusted
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-600">North:</span>{' '}
            <span className="font-mono">{currentBounds.north.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-600">South:</span>{' '}
            <span className="font-mono">{currentBounds.south.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-600">West:</span>{' '}
            <span className="font-mono">{currentBounds.west.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-600">East:</span>{' '}
            <span className="font-mono">{currentBounds.east.toFixed(6)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
