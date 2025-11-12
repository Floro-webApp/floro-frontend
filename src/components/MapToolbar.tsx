'use client';

import { Flame, MapPinned, Plus, Minus, X, Satellite } from 'lucide-react';

export interface MapToolbarProps {
  isCreating: boolean;
  onToggleCreate: () => void;
  isHeatmapVisible: boolean;
  onToggleHeatmap: () => void;
  isSatelliteView: boolean;
  onToggleSatellite: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  regionCount: number;
}

export default function MapToolbar({
  isCreating,
  onToggleCreate,
  isHeatmapVisible,
  onToggleHeatmap,
  isSatelliteView,
  onToggleSatellite,
  onZoomIn,
  onZoomOut,
  onResetView,
  regionCount,
}: MapToolbarProps) {
  // AWS-style button classes
  const btn = "px-3 py-1 text-xs border border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-all duration-150 flex items-center gap-1";
  const activeBtn = "px-3 py-1 text-xs border border-blue-400 bg-blue-500 text-white cursor-pointer transition-all duration-150 flex items-center gap-1 shadow-sm";
  const primaryBtn = isCreating 
    ? "px-3 py-1 text-xs bg-red-600 text-white border border-red-500 hover:bg-red-700 cursor-pointer transition-all duration-150 flex items-center gap-1"
    : "px-3 py-1 text-xs bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 cursor-pointer transition-all duration-150 flex items-center gap-1";
  const utilityBtn = "px-2 py-1 text-xs border border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-all duration-150";
  const infoSpan = "px-2 py-1 text-xs bg-white/10 border border-white/20 text-white font-medium";

  return (
    <div className="flex items-center gap-1">
      <button onClick={onToggleCreate} className={primaryBtn}>
        {isCreating ? (
          <>
            <X className="w-3 h-3" />
            Cancel
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            Create Region
          </>
        )}
      </button>
      
      <button onClick={onResetView} className={btn}>
        <MapPinned className="w-3 h-3" />
        Reset
      </button>
      
      <button onClick={onToggleSatellite} className={isSatelliteView ? activeBtn : btn}>
        <Satellite className="w-3 h-3" />
        Satellite
        {isSatelliteView && <span className="ml-1 text-xs">●</span>}
      </button>
      
      <button onClick={onToggleHeatmap} className={isHeatmapVisible ? activeBtn : btn}>
        <Flame className="w-3 h-3" />
        Heatmap
        {isHeatmapVisible && <span className="ml-1 text-xs">●</span>}
      </button>
      
      <span className={infoSpan}>
        REGIONS: {regionCount}
      </span>
    </div>
  );
} 