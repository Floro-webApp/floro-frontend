'use client';

import { MapPinned, Plus, X, Satellite } from 'lucide-react';

export interface MapToolbarProps {
  isCreating: boolean;
  onToggleCreate: () => void;
  isSatelliteView: boolean;
  onToggleSatellite: () => void;
  onResetView: () => void;
}

export default function MapToolbar({
  isCreating,
  onToggleCreate,
  isSatelliteView,
  onToggleSatellite,
  onResetView,
}: MapToolbarProps) {
  // AWS-style button classes
  const btn = "px-2 sm:px-3 py-1 text-[11px] sm:text-xs border border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-all duration-150 flex items-center gap-1 whitespace-nowrap";
  const activeBtn = "px-2 sm:px-3 py-1 text-[11px] sm:text-xs border border-blue-400 bg-blue-500 text-white cursor-pointer transition-all duration-150 flex items-center gap-1 shadow-sm whitespace-nowrap";
  const primaryBtn = isCreating 
    ? "px-2 sm:px-3 py-1 text-[11px] sm:text-xs bg-red-600 text-white border border-red-500 hover:bg-red-700 cursor-pointer transition-all duration-150 flex items-center gap-1 whitespace-nowrap"
    : "px-2 sm:px-3 py-1 text-[11px] sm:text-xs bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 cursor-pointer transition-all duration-150 flex items-center gap-1 whitespace-nowrap";

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      <button onClick={onToggleCreate} className={primaryBtn}>
        {isCreating ? (
          <>
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Cancel</span>
            <span className="sm:hidden">Stop</span>
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Create Region</span>
            <span className="sm:hidden">Create</span>
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
    </div>
  );
}
