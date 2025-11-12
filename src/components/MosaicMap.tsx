'use client';

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Map } from 'leaflet';
import { Region, CreateRegionDto, api, HeatmapDataPoint, AnalysisScheduleDto } from '../lib/api';
import HeatmapLayer from './HeatmapLayer';

export type { Map as LeafletMap } from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different region statuses
const createRegionIcon = (status: Region['status'], deforestationLevel?: number, isNdviMode = false, isScanning = false) => {
  let color = '#00ff88'; // bright green for active
  let scanningColor = '#00ffff'; // cyan for scanning effect
  if (status === 'PAUSED') color = '#ffaa00'; // bright orange for paused
  if (status === 'MONITORING') color = '#00aaff'; // bright blue for monitoring
  
  // Adjust color based on deforestation level
  if (deforestationLevel && deforestationLevel > 15) {
    color = '#ff3366'; // bright red for high deforestation
    scanningColor = '#ff6699';
  } else if (deforestationLevel && deforestationLevel > 8) {
    color = '#ffaa00'; // bright orange for moderate
    scanningColor = '#ffcc33';
  }

  const isActive = status === 'ACTIVE';
  const size = isNdviMode ? 40 : 32;
  const emoji = isNdviMode ? '📊' : (isActive && isScanning ? '🔍' : '🛰️');

  return L.divIcon({
    html: `
      <div class="region-marker-container" style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <!-- Scanning Ring Animation (only for active regions) -->
        ${isActive ? `
          <div class="scanning-ring" style="
            position: absolute;
            width: ${size * 2}px;
            height: ${size * 2}px;
            top: -${size / 2}px;
            left: -${size / 2}px;
            border: 2px solid ${scanningColor};
            border-radius: 50%;
            opacity: 0;
            animation: scanningPulse 3s infinite;
          "></div>
          <div class="scanning-ring" style="
            position: absolute;
            width: ${size * 1.5}px;
            height: ${size * 1.5}px;
            top: -${size / 4}px;
            left: -${size / 4}px;
            border: 1px solid ${scanningColor};
            border-radius: 50%;
            opacity: 0;
            animation: scanningPulse 3s infinite 0.5s;
          "></div>
        ` : ''}
        
        <!-- Main Icon -->
        <div class="region-icon" style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid ${isNdviMode ? '#0972d3' : 'rgba(255,255,255,0.9)'};
          box-shadow: 0 0 20px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.8),
                      0 0 40px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.4)${isNdviMode ? ', 0 0 60px rgba(9, 114, 211, 0.4)' : ''};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isNdviMode ? '18px' : '16px'};
          ${isNdviMode ? 'animation: pulse-ndvi 2s infinite;' : ''}
          ${isActive ? 'animation: activeRegionPulse 2s infinite;' : ''}
          z-index: 10;
        ">${emoji}</div>
        
        <!-- Scanning Beam (only for active regions) -->
        ${isActive ? `
          <div class="scanning-beam" style="
            position: absolute;
            width: 2px;
            height: ${size * 2}px;
            background: linear-gradient(to bottom, transparent, ${scanningColor}, transparent);
            top: -${size / 2}px;
            left: calc(50% - 1px);
            transform-origin: center ${size}px;
            animation: scanningBeam 4s infinite linear;
            opacity: 0.8;
          "></div>
        ` : ''}
      </div>
      
      <style>
        @keyframes scanningPulse {
          0%, 100% { 
            opacity: 0; 
            transform: scale(0.8); 
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.2); 
          }
        }
        
        @keyframes activeRegionPulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.8),
                        0 0 40px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.4);
          }
          50% { 
            box-shadow: 0 0 30px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 1),
                        0 0 60px rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.6),
                        0 0 80px ${scanningColor};
          }
        }
        
        @keyframes scanningBeam {
          0% { 
            transform: rotate(0deg); 
            opacity: 0; 
          }
          20% { 
            opacity: 0.8; 
          }
          80% { 
            opacity: 0.8; 
          }
          100% { 
            transform: rotate(360deg); 
            opacity: 0; 
          }
        }
        
        @keyframes pulse-ndvi { 
          0%, 100% { transform: scale(1); } 
          50% { transform: scale(1.1); } 
        }
      </style>
    `,
    className: 'custom-region-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// MapEvents component to handle map events like heatmap fetching
function MapEvents({ isHeatmapVisible, onDataFetched, onError }: { isHeatmapVisible: boolean, onDataFetched: (data: any[]) => void, onError: (msg: string) => void }) {
  const map = useMap();

  const fetchHeatmapData = async () => {
    if (!isHeatmapVisible) {
      onDataFetched([]); // Clear data if heatmap is not visible
      return;
    }
    try {
      const bounds = map.getBounds();
      const data = await api.getHeatmapData({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      const points = data.data.map(p => [p.lat, p.lng, p.intensity]);
      onDataFetched(points);
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error);
      onError("Could not load heatmap data for the current view.");
    }
  };

  useMapEvents({
    moveend: fetchHeatmapData,
    zoomend: fetchHeatmapData,
  });

  useEffect(() => {
    fetchHeatmapData();
  }, [isHeatmapVisible]); // Re-fetch when visibility changes

  return null;
}

// MapDeselectHandler component to handle deselection on map click
function MapDeselectHandler({ onRegionDeselected, isCreating }: { onRegionDeselected: () => void, isCreating: boolean }) {
  useMapEvents({
    click() {
      // Only deselect if not in creating mode to avoid conflicts
      if (!isCreating) {
        onRegionDeselected();
      }
    }
  });

  return null;
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
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startPoint: L.LatLng | null;
    currentPoint: L.LatLng | null;
    center: L.LatLng | null;
    radius: number;
  }>({
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    center: null,
    radius: 0
  });

  const map = useMap();

  useMapEvents({
    mousedown(e: any) {
      if (isCreating) {
        e.originalEvent.preventDefault();
        setDragState({
          isDragging: true,
          startPoint: e.latlng,
          currentPoint: e.latlng,
          center: e.latlng,
          radius: 0
        });
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      }
    },
    mousemove(e: any) {
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
    mouseup(e: any) {
      if (isCreating && dragState.isDragging && dragState.startPoint) {
        e.originalEvent.preventDefault();
        const radius = dragState.startPoint.distanceTo(e.latlng);
        const radiusKm = radius / 1000;
        
        if (radius < 100) {
          onError('Minimum radius is 100 meters. Please drag further to create a larger monitoring area.');
        } else if (radiusKm > 50) {
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
        
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
    }
  });

  const createRegion = async (center: L.LatLng, radiusMeters: number) => {
    try {
      const radiusKm = Math.round(radiusMeters / 1000 * 10) / 10;
      const regionName = `Forest Region near ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`;
      
      const regionData: CreateRegionDto = {
        name: regionName,
        latitude: Math.round(center.lat * 10000) / 10000,
        longitude: Math.round(center.lng * 10000) / 10000,
        description: `Monitoring region created at ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} with ${radiusKm}km radius`,
        radiusKm: Math.max(0.1, Math.min(50, radiusKm)),
        cloudCoverThreshold: 20
      };

      const newRegion = await api.createRegion(regionData);
      onRegionCreated(newRegion);
    } catch (error) {
      console.error('Failed to create region:', error);
      if (error instanceof Error) {
        onError(`Failed to create region: ${error.message}`);
      } else {
        onError('An unknown error occurred while creating the region.');
      }
    }
  };

  // Render the drag preview with modern styling
  if (dragState.isDragging && dragState.center && dragState.radius > 0) {
    const radiusKm = dragState.radius / 1000;
    const isValidRadius = radiusKm >= 0.1 && radiusKm <= 50;
    
    return (
      <>
        <Circle
          center={[dragState.center.lat, dragState.center.lng]}
          radius={dragState.radius}
          pathOptions={{
            color: isValidRadius ? '#00aaff' : '#ff3366',
            fillColor: isValidRadius ? '#00aaff' : '#ff3366',
            fillOpacity: 0.2,
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
        <Marker position={[dragState.center.lat, dragState.center.lng]} icon={L.divIcon({ className: 'leaflet-mouse-marker', iconAnchor: [0, 0], iconSize: [0, 0] })} />
        <div className="leaflet-tooltip" style={{
            position: 'absolute',
            top: `${(map.latLngToContainerPoint(dragState.currentPoint as L.LatLng).y)}px`,
            left: `${(map.latLngToContainerPoint(dragState.currentPoint as L.LatLng).x + 15)}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '8px 12px',
            border: `2px solid ${isValidRadius ? '#00aaff' : '#ff3366'}`,
            borderRadius: '8px',
            boxShadow: `0 0 20px ${isValidRadius ? 'rgba(0, 170, 255, 0.5)' : 'rgba(255, 51, 102, 0.5)'}`,
            whiteSpace: 'nowrap',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px'
        }}>
            Radius: {radiusKm.toFixed(2)} km
        </div>
      </>
    );
  }

  return null;
}

interface MosaicMapProps {
  onRegionSelected: (region: Region) => void;
  onRegionDeselected: () => void;
  onError: (error: string) => void;
  isHeatmapVisible: boolean;
  isSatelliteView: boolean;
  isCreating: boolean;
  setIsCreating: (isCreating: boolean) => void;
  onRegionCreated: (region: Region) => void;
  regions: Region[];
  selectedRegion: Region | null;
  ndviSelectionMode?: boolean;
}

const MosaicMap = forwardRef<Map, MosaicMapProps>(({ 
  onRegionSelected, 
  onRegionDeselected,
  onError,
  isHeatmapVisible,
  isSatelliteView,
  isCreating,
  setIsCreating,
  onRegionCreated,
  regions,
  selectedRegion,
  ndviSelectionMode = false
}, ref) => {
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [mapKey, setMapKey] = useState<number>(Date.now());
  
  // New state for analysis control
  const [analysisSchedules, setAnalysisSchedules] = useState<Record<string, AnalysisScheduleDto>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [scanningRegions, setScanningRegions] = useState<Set<string>>(new Set());

  useImperativeHandle(ref, () => mapInstance!, [mapInstance]);

  const defaultCenter: [number, number] = [19.7515, 75.7139];

  // Fetch analysis schedule for a region
  const fetchAnalysisSchedule = async (regionId: string) => {
    try {
      const schedule = await api.getAnalysisSchedule(regionId);
      setAnalysisSchedules(prev => ({ ...prev, [regionId]: schedule }));
      
      // Update scanning state based on status
      if (schedule.status === 'ACTIVE') {
        setScanningRegions(prev => new Set([...prev, regionId]));
      } else {
        setScanningRegions(prev => {
          const newSet = new Set(prev);
          newSet.delete(regionId);
          return newSet;
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch analysis schedule for region ${regionId}:`, error);
    }
  };

  // Load analysis schedules for all regions
  useEffect(() => {
    if (regions.length > 0) {
      regions.forEach(region => {
        fetchAnalysisSchedule(region.id);
      });
    }
  }, [regions]);

  // Handle pause region analysis
  const handlePauseAnalysis = async (regionId: string) => {
    setLoadingStates(prev => ({ ...prev, [regionId]: true }));
    try {
      const result = await api.pauseRegionAnalysis(regionId);
      setAnalysisSchedules(prev => ({ ...prev, [regionId]: { ...prev[regionId], status: result.status } }));
      setScanningRegions(prev => {
        const newSet = new Set(prev);
        newSet.delete(regionId);
        return newSet;
      });
      
      // Play pause/stop sound effect
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LBwUKlgAFAMaGzZ4i5g8J6EvWIgkKEczg1wTOZdKy8nGOAcGxBOu8+2wMPgQnDxD1QZsGMwQqKrClKHRLOyWNSgq1MgQOnhQkGMZmTHD8kZtM8YnVoZD2uxCLMzJdHqYMGh8NVNQN3gXYnIyW');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore audio errors
      } catch {}
      
      onError && onError(`Analysis paused for ${regions.find(r => r.id === regionId)?.name || 'region'}`);
    } catch (error) {
      console.error('Failed to pause analysis:', error);
      onError && onError(`Failed to pause analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [regionId]: false }));
    }
  };

  // Handle resume/start region analysis
  const handleStartAnalysis = async (regionId: string) => {
    setLoadingStates(prev => ({ ...prev, [regionId]: true }));
    try {
      const result = await api.startRegionAnalysis(regionId, {
        cronExpression: '*/30 * * * *', // Every 30 minutes by default
        triggerImmediate: false
      });
      setAnalysisSchedules(prev => ({ ...prev, [regionId]: { ...prev[regionId], status: result.status } }));
      setScanningRegions(prev => new Set([...prev, regionId]));
      
      // Play start/activation sound effect
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDwULsagFGNaGzZ4i5g8J6gvWIgkKEczg1wTOZdKy8nGOAcGxBOu8+2wMPQQnDxD1QZsGMwQqKrClKHRLOyWNSgq1MgQOnhQkGNZmTHD8kZtM8YnVoZD2uxCLMzJdHqYMGh8NVNQN3gXYnIyW');
        audio.volume = 0.4;
        audio.play().catch(() => {}); // Ignore audio errors
      } catch {}
      
      onError && onError(`Analysis started for ${regions.find(r => r.id === regionId)?.name || 'region'}`);
    } catch (error) {
      console.error('Failed to start analysis:', error);
      onError && onError(`Failed to start analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [regionId]: false }));
    }
  };

  // Cleanup function for map instance
  useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          // Get container before removing the map
          const container = mapInstance.getContainer();
          
          // Remove the map instance
          mapInstance.off(); // Remove all event listeners first
          mapInstance.remove(); // Then remove the map
          
          // Leaflet leaves a reference on the container element that causes
          // "Map container is being reused by another instance" if the
          // component is remounted very quickly (e.g. when moving panels or
          // under React 18 strict-mode double mounts). Removing or deleting
          // that property ensures the next initialisation starts cleanly.
          if (container && container.parentNode && (container as any)._leaflet_id !== undefined) {
            try {
              delete (container as any)._leaflet_id;
            } catch {
              (container as any)._leaflet_id = undefined;
            }
          }
        } catch (error) {
          console.warn('Error cleaning up map instance:', error);
        }
      }
    };
  }, [mapInstance]);

  // If the container layout changes, invalidate map size to ensure correct rendering
  useEffect(() => {
    if (mapInstance) {
      // Give the browser a tick to finish layout changes before invalidating
      const timeout = setTimeout(() => {
        try {
          mapInstance.invalidateSize();
        } catch (error) {
          console.warn('Error invalidating map size:', error);
        }
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [mapInstance]);

  const getRegionStatusColor = (region: Region) => {
    const deforestation = region.lastDeforestationPercentage || 0;
    if (deforestation > 15) return '#ff3366'; // bright red
    if (deforestation > 8) return '#ffaa00'; // bright orange
    if (region.status === 'ACTIVE') return '#00ff88'; // bright green
    if (region.status === 'PAUSED') return '#ffaa00'; // bright orange
    return '#00aaff'; // bright blue
  };

  const renderModernRadiusCircles = (region: Region, isScanning = false) => {
    // Defensive checks to prevent geometry errors
    if (!region || typeof region.latitude !== 'number' || typeof region.longitude !== 'number' || typeof region.radiusKm !== 'number') {
      console.warn('Invalid region data for rendering circles:', region);
      return null;
    }

    if (!mapInstance) {
      return null;
    }

    try {
      const schedule = analysisSchedules[region.id];
      const status = schedule?.status || region.status;
      const color = getRegionStatusColor(region);
      const center: [number, number] = [region.latitude, region.longitude];
      const radius = region.radiusKm * 1000; // Convert km to meters
      
      // Enhanced colors for scanning effect
      const scanningColor = status === 'ACTIVE' ? '#00ffff' : color;
      const pulseOpacity = isScanning ? 0.3 : 0.05;
      
      return (
        <div key={`circles-${region.id}`}>
          {/* Scanning pulse effect for active regions */}
          {status === 'ACTIVE' && isScanning && (
            <>
              <Circle
                center={center}
                radius={radius * 1.3}
                pathOptions={{
                  color: scanningColor,
                  fillColor: scanningColor,
                  fillOpacity: 0.1,
                  weight: 3,
                  opacity: 0.6,
                  dashArray: '15, 10',
                  className: 'scanning-outer-ring'
                }}
              />
              <Circle
                center={center}
                radius={radius * 1.15}
                pathOptions={{
                  color: scanningColor,
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: '8, 6',
                  className: 'scanning-middle-ring'
                }}
              />
            </>
          )}
          
          {/* Outer detection perimeter */}
          <Circle
            center={center}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: pulseOpacity,
              weight: isScanning ? 3 : 2,
              opacity: isScanning ? 1 : 0.8,
              dashArray: isScanning ? '12, 8' : '10, 5',
            }}
          />
          
          {/* Middle monitoring zone */}
          <Circle
            center={center}
            radius={radius * 0.7}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isScanning ? 0.15 : 0.1,
              weight: isScanning ? 2 : 1.5,
              opacity: isScanning ? 0.8 : 0.6,
              dashArray: isScanning ? '8, 4' : '5, 5',
            }}
          />
          
          {/* Inner core zone */}
          <Circle
            center={center}
            radius={radius * 0.4}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isScanning ? 0.25 : 0.15,
              weight: isScanning ? 2 : 1,
              opacity: 1,
            }}
          />
        </div>
      );
    } catch (error) {
      console.warn('Error rendering region circles:', error, region);
      return null;
    }
  };
  
  return (
    <div className="relative h-full w-full">
      {/* Add custom CSS for animations and popup styling */}
      <style jsx global>{`
        .leaflet-container {
          background: ${isSatelliteView ? '#0a0a0a' : '#f8f9fa'} !important;
        }

        /* Override Leaflet popup styling for square design */}
        .leaflet-popup-content-wrapper {
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        
        .leaflet-popup-tip {
          border-radius: 0 !important;
        }
        
        .leaflet-popup-tip-container {
          border-radius: 0 !important;
        }

        /* Enhanced scanning ring animations */
        .scanning-outer-ring {
          animation: scanningOuterRing 4s infinite ease-in-out;
        }
        
        .scanning-middle-ring {
          animation: scanningMiddleRing 3s infinite ease-in-out 0.5s;
        }
        
        @keyframes scanningOuterRing {
          0%, 100% { 
            stroke-opacity: 0.3; 
            stroke-dashoffset: 0;
            filter: drop-shadow(0 0 8px currentColor);
          }
          50% { 
            stroke-opacity: 0.8; 
            stroke-dashoffset: 25;
            filter: drop-shadow(0 0 16px currentColor) drop-shadow(0 0 32px currentColor);
          }
        }
        
        @keyframes scanningMiddleRing {
          0%, 100% { 
            stroke-opacity: 0.5; 
            stroke-dashoffset: 0;
          }
          50% { 
            stroke-opacity: 1; 
            stroke-dashoffset: -14;
          }
        }

        /* Futuristic glow effects for active regions */
        .leaflet-interactive[stroke="#00ff88"] {
          filter: drop-shadow(0 0 6px #00ff88) drop-shadow(0 0 12px #00ff88aa);
        }
        
        .leaflet-interactive[stroke="#00ffff"] {
          filter: drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 16px #00ffff66);
          animation: cyberGlow 2s infinite alternate;
        }
        
        @keyframes cyberGlow {
          0% { 
            filter: drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 16px #00ffff66);
          }
          100% { 
            filter: drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 24px #00ffff88) drop-shadow(0 0 36px #00ffff44);
          }
        }

        /* Popup button hover effects */
        .leaflet-popup button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .leaflet-popup button:active {
          transform: translateY(0);
        }

        /* Enhanced marker pulsing for active scanning */
        .custom-region-marker.scanning {
          animation: scannerPulse 1.5s infinite;
        }
        
        @keyframes scannerPulse {
          0%, 100% { 
            transform: scale(1); 
            filter: brightness(1); 
          }
          50% { 
            transform: scale(1.1); 
            filter: brightness(1.3) saturate(1.5); 
          }
        }
      `}</style>

      <MapContainer 
        key={mapKey}
        ref={setMapInstance}
        center={defaultCenter} 
        zoom={7} 
        className="h-full w-full"
      >
        {isSatelliteView ? (
          <>
            {/* Satellite Tile Layer */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
            {/* Hybrid overlay for labels */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              opacity={0.7}
            />
          </>
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        )}
        
        {isHeatmapVisible && heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}

        <MapEvents isHeatmapVisible={isHeatmapVisible} onDataFetched={setHeatmapPoints} onError={onError} />

        <MapDeselectHandler onRegionDeselected={onRegionDeselected} isCreating={isCreating} />

        <DragCreateHandler 
          onRegionCreated={onRegionCreated}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          onError={onError}
        />

        {regions.map(region => {
          // Defensive check for valid region data
          if (!region || !region.id || typeof region.latitude !== 'number' || typeof region.longitude !== 'number') {
            console.warn('Skipping invalid region:', region);
            return null;
          }

          try {
            const isSelected = selectedRegion?.id === region.id;
            const schedule = analysisSchedules[region.id];
            const isScanning = scanningRegions.has(region.id);
            const isLoading = loadingStates[region.id] || false;
            
            return (
              <div key={region.id}>
                <Marker 
                  position={[region.latitude, region.longitude]}
                  icon={createRegionIcon(
                    schedule?.status || region.status, 
                    region.lastDeforestationPercentage, 
                    ndviSelectionMode,
                    isScanning
                  )}
                  eventHandlers={{
                    click: () => onRegionSelected(region),
                  }}
                >
                  <Popup>
                    <div className={`min-w-[280px] ${isSatelliteView ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} shadow-xl`}>
                    {/* NDVI Selection Mode Banner */}
                    {ndviSelectionMode && (
                      <div className="bg-blue-600 text-white px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>📊</span>
                          <span className="text-sm font-medium">Click to select for NDVI analysis</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Header Section */}
                    <div className={`px-4 py-3 border-b ${isSatelliteView ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${isSatelliteView ? 'text-white' : 'text-gray-900'}`}>
                          {ndviSelectionMode ? 'NDVI ANALYSIS TARGET' : 'FOREST REGION'}
                        </h3>
                        <div className={`px-2 py-1 text-xs font-medium rounded ${
                          region.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          region.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {region.status}
                        </div>
                      </div>
                      <h4 className={`font-bold text-base mt-1 ${isSatelliteView ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {region.name}
                      </h4>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 py-3">
                      <p className={`text-sm mb-4 ${isSatelliteView ? 'text-gray-300' : 'text-gray-600'}`}>
                        {region.description}
                      </p>

                      {/* Analysis Status Panel */}
                      {schedule && (
                        <div className={`mb-4 p-3 border-l-4 ${
                          schedule.status === 'ACTIVE' ? 'border-green-500 bg-green-50' :
                          schedule.status === 'PAUSED' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        } ${isSatelliteView ? 'bg-opacity-20' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className={`text-xs font-medium ${
                              schedule.status === 'ACTIVE' ? 'text-green-700' :
                              schedule.status === 'PAUSED' ? 'text-yellow-700' :
                              'text-blue-700'
                            } ${isSatelliteView ? 'text-opacity-80' : ''}`}>
                              {schedule.status === 'ACTIVE' ? '🔄 ACTIVELY SCANNING' :
                               schedule.status === 'PAUSED' ? '⏸️ ANALYSIS PAUSED' :
                               '📊 MANUAL MONITORING'}
                            </div>
                            {schedule.status === 'ACTIVE' && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-600 font-medium">LIVE</span>
                              </div>
                            )}
                          </div>
                          {schedule.nextAnalysis && (
                            <div className={`text-xs ${isSatelliteView ? 'text-gray-400' : 'text-gray-600'}`}>
                              Next scan: {new Date(schedule.nextAnalysis).toLocaleTimeString()}
                            </div>
                          )}
                          {schedule.analysesLast24h > 0 && (
                            <div className={`text-xs ${isSatelliteView ? 'text-gray-400' : 'text-gray-600'}`}>
                              {schedule.analysesLast24h} scans in last 24h
                            </div>
                          )}
                        </div>
                      )}

                      {/* Control Buttons */}
                      {!ndviSelectionMode && (
                        <div className="mb-4 flex gap-2">
                          {schedule?.status === 'ACTIVE' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePauseAnalysis(region.id);
                              }}
                              disabled={isLoading}
                              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-all ${
                                isLoading 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-yellow-600 hover:bg-yellow-700 text-white hover:scale-105 active:scale-95'
                              } ${isSatelliteView ? 'bg-opacity-90' : ''}`}
                            >
                              {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>PAUSING...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <span>⏸️</span>
                                  <span>PAUSE SCANNING</span>
                                </div>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartAnalysis(region.id);
                              }}
                              disabled={isLoading}
                              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-all ${
                                isLoading 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95'
                              } ${isSatelliteView ? 'bg-opacity-90' : ''}`}
                            >
                              {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>STARTING...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <span>START SCANNING</span>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 ${isSatelliteView ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            MONITORING RADIUS
                          </div>
                          <div className={`text-lg font-bold ${isSatelliteView ? 'text-white' : 'text-gray-900'}`}>
                            {region.radiusKm} km
                          </div>
                        </div>

                        <div className={`p-3 ${isSatelliteView ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            DEFORESTATION RISK
                          </div>
                          <div className={`text-lg font-bold ${
                            (region.lastDeforestationPercentage || 0) > 15 ? 'text-red-500' :
                            (region.lastDeforestationPercentage || 0) > 8 ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>
                            {region.lastDeforestationPercentage?.toFixed(1) ?? 'N/A'}%
                          </div>
                        </div>
                      </div>

                      {/* Last Analysis */}
                      {(region.lastAnalysis || schedule?.lastAnalysis) && (
                        <div className={`mt-4 pt-3 border-t ${isSatelliteView ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className={`text-xs font-medium ${isSatelliteView ? 'text-gray-400' : 'text-gray-500'}`}>
                            LAST ANALYSIS
                          </div>
                          <div className={`text-sm ${isSatelliteView ? 'text-gray-300' : 'text-gray-700'}`}>
                            {new Date(region.lastAnalysis || schedule?.lastAnalysis || '').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Closing popup content wrapper */}
                    </div>
                  </Popup>
                </Marker>

                {/* Modern radius visualization with selection indicator */}
                {isSelected ? (
                  // Selected region - add highlight
                  <>
                    {renderModernRadiusCircles(region, isScanning)}
                    <Circle
                      center={[region.latitude, region.longitude]}
                      radius={region.radiusKm * 1000 * 1.1} // Slightly larger outer ring
                      pathOptions={{
                        color: '#0972d3',
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        weight: 4,
                        opacity: 1,
                        dashArray: '5, 5',
                      }}
                    />
                  </>
                ) : (
                  renderModernRadiusCircles(region, isScanning)
                )}
              </div>
            );
          } catch (error) {
            console.warn('Error rendering region:', error, region);
            return null;
          }
        }).filter(Boolean)}

      </MapContainer>
    </div>
  );
});

MosaicMap.displayName = 'MosaicMap';
export default MosaicMap; 