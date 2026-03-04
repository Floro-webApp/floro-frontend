'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Region, CreateRegionDto, api } from '../lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different region statuses
const createRegionIcon = (status: Region['status'], deforestationLevel?: number) => {
  let color = '#22c55e'; // green for active
  if (status === 'PAUSED') color = '#f59e0b'; // amber for paused
  if (status === 'MONITORING') color = '#3b82f6'; // blue for monitoring
  
  // Adjust color based on deforestation level
  if (deforestationLevel && deforestationLevel > 15) color = '#ef4444'; // red for high deforestation
  else if (deforestationLevel && deforestationLevel > 8) color = '#f59e0b'; // amber for moderate
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">🌳</div>
    `,
    className: 'custom-region-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface DragState {
  isDragging: boolean;
  startPoint: L.LatLng | null;
  currentPoint: L.LatLng | null;
  center: L.LatLng | null;
  radius: number;
}

// Custom hook for drag-to-create functionality
function DragCreateHandler({ 
  onRegionCreated,
  isCreating,
  setIsCreating,
  onError
}: { 
  onRegionCreated: (region: Region) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  onError: (error: string) => void;
}) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    center: null,
    radius: 0
  });

  const map = useMap();

  useMapEvents({
    mousedown(e) {
      if (isCreating) {
        e.originalEvent.preventDefault(); // Prevent text selection
        setDragState({
          isDragging: true,
          startPoint: e.latlng,
          currentPoint: e.latlng,
          center: e.latlng,
          radius: 0
        });
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      }
    },
    mousemove(e) {
      if (isCreating && dragState.isDragging && dragState.startPoint) {
        e.originalEvent.preventDefault();
        const radius = dragState.startPoint.distanceTo(e.latlng);
        setDragState(prev => ({
          ...prev,
          currentPoint: e.latlng,
          radius: radius
        }));
      }
    },
    mouseup(e) {
      if (isCreating && dragState.isDragging && dragState.startPoint) {
        e.originalEvent.preventDefault();
        const radius = dragState.startPoint.distanceTo(e.latlng);
        const radiusKm = radius / 1000;
        
        // Validate radius constraints
        if (radius < 100) { // Minimum 100m radius
          onError('Minimum radius is 100 meters. Please drag further to create a larger monitoring area.');
        } else if (radiusKm > 50) { // Maximum 50km radius as per API
          onError('Maximum radius is 50 kilometers. Please create a smaller monitoring area.');
        } else {
          createRegion(dragState.startPoint, radius);
        }
        
        setDragState({
          isDragging: false,
          startPoint: null,
          currentPoint: null,
          center: null,
          radius: 0
        });
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        setIsCreating(false);
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
    }
  });

  const createRegion = async (center: L.LatLng, radiusMeters: number) => {
    try {
      const radiusKm = Math.round(radiusMeters / 1000 * 10) / 10; // Round to 1 decimal place
      const regionName = `Forest Region ${new Date().toISOString().slice(0, 10)}`;
      
      const regionData: CreateRegionDto = {
        name: regionName,
        latitude: Math.round(center.lat * 10000) / 10000, // Round to 4 decimal places
        longitude: Math.round(center.lng * 10000) / 10000,
        description: `Monitoring region created at ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} with ${radiusKm}km radius`,
        radiusKm: Math.max(1, Math.min(50, radiusKm)), // Ensure between 1-50km
        cloudCoverThreshold: 20
      };

      const newRegion = await api.createRegion(regionData);
      onRegionCreated(newRegion);
    } catch (error) {
      console.error('Failed to create region:', error);
      if (error instanceof Error) {
        onError(`Failed to create region: ${error.message}`);
      } else {
        onError('Failed to create region. Please try again.');
      }
    }
  };

  // Render the drag preview
  if (dragState.isDragging && dragState.center && dragState.radius > 0) {
    const radiusKm = dragState.radius / 1000;
    const isValidRadius = radiusKm >= 0.1 && radiusKm <= 50;
    
    return (
      <>
        <Circle
          center={[dragState.center.lat, dragState.center.lng]}
          radius={dragState.radius}
          pathOptions={{
            color: isValidRadius ? '#3b82f6' : '#ef4444',
            fillColor: isValidRadius ? '#3b82f6' : '#ef4444',
            fillOpacity: 0.2,
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
        <Marker position={[dragState.center.lat, dragState.center.lng]} />
        {/* Show radius info */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          {radiusKm.toFixed(1)} km
          {!isValidRadius && (
            <div style={{ fontSize: '12px', color: '#fca5a5' }}>
              {radiusKm < 0.1 ? 'Too small (min 0.1km)' : 'Too large (max 50km)'}
            </div>
          )}
        </div>
      </>
    );
  }

  return null;
}

interface DragCreateMapProps {
  onRegionCreated?: (region: Region) => void;
}

export default function DragCreateMap({ onRegionCreated }: DragCreateMapProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultCenter: [number, number] = [19, 75]; // Amazon region

  // Load existing regions on mount
  useEffect(() => {
    loadRegions();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadRegions = async () => {
    try {
      const data = await api.getRegions();
      setRegions(data);
    } catch (err) {
      console.error('Failed to load regions:', err);
      setError('Failed to load existing regions');
    }
  };

  const handleRegionCreated = (region: Region) => {
    setRegions(prev => [...prev, region]);
    setSelectedRegion(region);
    setEditingRegion({ ...region });
    setIsSheetOpen(true);
    setError(null); // Clear any previous errors
    onRegionCreated?.(region);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleUpdateRegion = async () => {
    if (!editingRegion) return;

    // Validate radius before sending
    if (editingRegion.radiusKm > 50) {
      setError('Radius cannot exceed 50 kilometers');
      return;
    }
    if (editingRegion.radiusKm < 1) {
      setError('Radius must be at least 1 kilometer');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: editingRegion.name,
        description: editingRegion.description,
        radiusKm: editingRegion.radiusKm,
        cloudCoverThreshold: editingRegion.cloudCoverThreshold,
      };

      const updatedRegion = await api.updateRegion(editingRegion.id, updateData);
      setRegions(prev => prev.map(r => r.id === updatedRegion.id ? updatedRegion : r));
      setSelectedRegion(updatedRegion);
      setError(null);
    } catch (err) {
      console.error('Failed to update region:', err);
      if (err instanceof Error && err.message.includes('radiusKm')) {
        setError('Radius must be between 1 and 50 kilometers');
      } else {
        setError('Failed to update region');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRegion = async () => {
    if (!editingRegion) return;

    setLoading(true);
    try {
      await api.deleteRegion(editingRegion.id);
      setRegions(prev => prev.filter(r => r.id !== editingRegion.id));
      setIsSheetOpen(false);
      setSelectedRegion(null);
      setEditingRegion(null);
      setError(null);
    } catch (err) {
      console.error('Failed to delete region:', err);
      setError('Failed to delete region');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!selectedRegion) return;

    setLoading(true);
    try {
      // Generate date range for the last 3 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      await api.triggerAnalysis(
        selectedRegion.latitude,
        selectedRegion.longitude,
        startDateStr,
        endDateStr,
        selectedRegion.cloudCoverThreshold
      );
      setError(null);
      // You could show a success message here
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
      setError('Failed to trigger analysis');
    } finally {
      setLoading(false);
    }
  };

  const toggleCreationMode = () => {
    setIsCreating(!isCreating);
    setError(null);
  };

  const getRegionStatusColor = (region: Region) => {
    const deforestation = region.lastDeforestationPercentage || 0;
    if (deforestation > 15) return '#ef4444'; // red
    if (deforestation > 8) return '#f59e0b'; // amber
    if (region.status === 'ACTIVE') return '#22c55e'; // green
    if (region.status === 'PAUSED') return '#f59e0b'; // amber
    return '#3b82f6'; // blue
  };

  return (
    <div className="relative">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-3">
          <Button
            onClick={toggleCreationMode}
            variant={isCreating ? "destructive" : "default"}
            className="w-full"
          >
            {isCreating ? 'Cancel' : 'Drag to Create'}
          </Button>
          
          {isCreating && (
            <div className="text-sm text-gray-600 text-center space-y-1">
              <p>Click and drag to create a monitoring region</p>
              <p className="text-xs text-gray-500">Radius: 0.1km - 50km</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 pt-2 border-t">
            <div className="font-medium">Regions: {regions.length}</div>
            {regions.length === 0 && (
              <div className="text-gray-400 mt-1">No monitoring regions yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md shadow-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {regions.length === 0 && !isCreating && (
        <div className="absolute inset-0 z-[1000] bg-black/5 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-[#f2f3f3] text-[#687078] text-2xl font-bold flex items-center justify-center mb-4 mx-auto" style={{ borderRadius: '2px' }}>
              MAP
            </div>
            <h3 className="text-lg font-semibold text-[#0f1419] mb-2">No Monitoring Regions</h3>
            <p className="text-[#687078] mb-4">Create your first forest monitoring region by clicking "Drag to Create" and drawing on the map.</p>
            <div className="text-sm text-[#687078]">
              <div>• Click and drag to create circular regions</div>
              <div>• Monitor Vegetation Stress in real-time</div>
              <div>• Set custom radius (0.1km - 50km)</div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className={`w-full h-[600px] rounded-lg overflow-hidden ${isCreating ? 'select-none' : ''}`}>
        <MapContainer 
          center={defaultCenter} 
          zoom={7} 
          scrollWheelZoom={true}
          className={`w-full h-full ${isCreating ? 'cursor-crosshair' : ''}`}
          style={{ zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Drag create handler */}
          <DragCreateHandler
            onRegionCreated={handleRegionCreated}
            isCreating={isCreating}
            setIsCreating={setIsCreating}
            onError={handleError}
          />
          
          {/* Existing regions */}
          {regions.map((region) => (
            <div key={region.id}>
              <Marker 
                position={[region.latitude, region.longitude]}
                icon={createRegionIcon(region.status, region.lastDeforestationPercentage)}
                eventHandlers={{
                  click: () => {
                    setSelectedRegion(region);
                    setEditingRegion({ ...region });
                    setIsSheetOpen(true);
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{region.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{region.description}</p>
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium">Status:</span> {region.status}</div>
                      <div><span className="font-medium">Radius:</span> {region.radiusKm} km</div>
                      {region.lastDeforestationPercentage && (
                        <div><span className="font-medium">Vegetation Stress:</span> {region.lastDeforestationPercentage}%</div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Monitoring radius circle */}
              <Circle
                center={[region.latitude, region.longitude]}
                radius={region.radiusKm * 1000} // Convert km to meters
                pathOptions={{
                  color: getRegionStatusColor(region),
                  fillColor: getRegionStatusColor(region),
                  fillOpacity: 0.1,
                  weight: 2,
                  opacity: 0.6,
                }}
              />
            </div>
          ))}
        </MapContainer>
      </div>

      {/* Side Panel */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingRegion ? 'Edit Region' : 'Region Details'}
            </SheetTitle>
            <SheetDescription>
              Configure monitoring settings for this forest region
            </SheetDescription>
          </SheetHeader>

          {editingRegion && (
            <div className="flex flex-col gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Region Name</label>
                <Input
                  value={editingRegion.name}
                  onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                  placeholder="Enter region name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingRegion.description}
                  onChange={(e) => setEditingRegion({ ...editingRegion, description: e.target.value })}
                  placeholder="Describe this monitoring region"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Radius (km)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    value={editingRegion.radiusKm}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 1;
                      setEditingRegion({ ...editingRegion, radiusKm: Math.min(50, Math.max(1, value)) });
                    }}
                  />
                  <p className="text-xs text-gray-500">Max: 50km</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cloud Cover %</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingRegion.cloudCoverThreshold}
                    onChange={(e) => setEditingRegion({ ...editingRegion, cloudCoverThreshold: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <div><span className="font-medium">Coordinates:</span> {editingRegion.latitude.toFixed(4)}, {editingRegion.longitude.toFixed(4)}</div>
                <div><span className="font-medium">Status:</span> {editingRegion.status}</div>
                {editingRegion.lastDeforestationPercentage && (
                  <div><span className="font-medium">Vegetation Stress:</span> {editingRegion.lastDeforestationPercentage}%</div>
                )}
                {editingRegion.lastAnalysis && (
                  <div><span className="font-medium">Last Analysis:</span> {new Date(editingRegion.lastAnalysis).toLocaleDateString()}</div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  onClick={handleUpdateRegion}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Updating...' : 'Update Region'}
                </Button>
                <Button 
                  onClick={handleTriggerAnalysis}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? 'Starting...' : 'Trigger Analysis'}
                </Button>
                <Button 
                  onClick={handleDeleteRegion}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  {loading ? 'Deleting...' : 'Delete Region'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
} 
