'use client';

import React, { useState, useEffect } from 'react';
import { Region, api } from '../lib/api';
import { 
  Image, 
  BarChart3, 
  MapPin, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Download, 
  ZoomIn,
  AlertTriangle,
  Loader2,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ScatterChart,
  ChevronDown
} from 'lucide-react';

// Interfaces for the visualization API
interface VisualizationItem {
  chartType: string;
  tileId: string;
  timestamp: string;
  url: string;
  createdAt: string;
  description: string;
}

interface VisualizationsResponse {
  regionId: string;
  regionName: string;
  visualizations: VisualizationItem[];
  totalVisualizations: number;
  retrievedAt: string;
}

// Grouped visualization structure
interface GroupedVisualization {
  chartType: string;
  description: string;
  tiles: {
    [tileId: string]: {
      timestamps: VisualizationItem[];
    };
  };
}

// Chart type metadata
const CHART_METADATA = {
  ndvi_red_clusters: {
    icon: <ScatterChart size={16} />,
    color: 'bg-green-100 text-green-700',
    category: 'Scatter Analysis'
  },
  geographic_distribution: {
    icon: <MapPin size={16} />,
    color: 'bg-blue-100 text-blue-700',
    category: 'Geographic'
  },
  feature_distributions: {
    icon: <BarChart3 size={16} />,
    color: 'bg-purple-100 text-purple-700',
    category: 'Distributions'
  },
  cluster_statistics: {
    icon: <Activity size={16} />,
    color: 'bg-orange-100 text-orange-700',
    category: 'Statistics'
  },
  ndvi_nir_clusters: {
    icon: <ScatterChart size={16} />,
    color: 'bg-teal-100 text-teal-700',
    category: 'Scatter Analysis'
  }
};

interface Props {
  selectedRegion?: Region | null;
}

export default function KMeansClusteringPanel({ selectedRegion }: Props) {
  const [visualizations, setVisualizations] = useState<VisualizationsResponse | null>(null);
  const [groupedVisualizations, setGroupedVisualizations] = useState<GroupedVisualization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Group visualizations by chart type and tile ID
  const groupVisualizations = (visualizations: VisualizationItem[]): GroupedVisualization[] => {
    const grouped: { [chartType: string]: GroupedVisualization } = {};

    visualizations.forEach(viz => {
      if (!grouped[viz.chartType]) {
        grouped[viz.chartType] = {
          chartType: viz.chartType,
          description: viz.description,
          tiles: {}
        };
      }

      if (!grouped[viz.chartType].tiles[viz.tileId]) {
        grouped[viz.chartType].tiles[viz.tileId] = {
          timestamps: []
        };
      }

      grouped[viz.chartType].tiles[viz.tileId].timestamps.push(viz);
    });

    // Sort timestamps within each tile (newest first)
    Object.values(grouped).forEach(chartGroup => {
      Object.values(chartGroup.tiles).forEach(tileGroup => {
        tileGroup.timestamps.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      });
    });

    return Object.values(grouped).sort((a, b) => a.chartType.localeCompare(b.chartType));
  };

  // Load visualizations for the selected region
  const loadVisualizations = async (regionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // const data: VisualizationsResponse = await api.getRegionVisualizations(regionId);
      const data: VisualizationsResponse = {
        regionId: regionId,
        regionName: 'Test Region',
        visualizations: [],
        totalVisualizations: 0,
        retrievedAt: new Date().toISOString()
      };
      setVisualizations(data);
      
      const grouped = groupVisualizations(data.visualizations);
      setGroupedVisualizations(grouped);
      
      // Auto-select the first available visualization
      if (grouped.length > 0) {
        const firstChartType = grouped[0].chartType;
        const firstTileId = Object.keys(grouped[0].tiles)[0];
        const firstVisualization = grouped[0].tiles[firstTileId].timestamps[0];
        
        setSelectedChartType(firstChartType);
        setSelectedTileId(firstTileId);
        setSelectedVisualization(firstVisualization);
        setImageLoading(true);
        setImageError(false);
      }
    } catch (err) {
      console.error('Error loading visualizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visualizations');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to load visualizations when region changes
  useEffect(() => {
    if (selectedRegion?.id) {
      loadVisualizations(selectedRegion.id);
    } else {
      setVisualizations(null);
      setGroupedVisualizations([]);
      setSelectedChartType(null);
      setSelectedTileId(null);
      setSelectedVisualization(null);
      setImageLoading(false);
      setImageError(false);
    }
  }, [selectedRegion?.id]);

  // Effect to reset image loading state when visualization changes
  useEffect(() => {
    if (selectedVisualization) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [selectedVisualization]);

  // Handle chart type selection
  const handleChartTypeSelect = (chartType: string) => {
    setSelectedChartType(chartType);
    
    const chartGroup = groupedVisualizations.find(g => g.chartType === chartType);
    if (chartGroup) {
      const firstTileId = Object.keys(chartGroup.tiles)[0];
      const firstVisualization = chartGroup.tiles[firstTileId].timestamps[0];
      
      setSelectedTileId(firstTileId);
      setSelectedVisualization(firstVisualization);
    }
  };

  // Handle tile selection
  const handleTileSelect = (tileId: string) => {
    setSelectedTileId(tileId);
    
    if (selectedChartType) {
      const chartGroup = groupedVisualizations.find(g => g.chartType === selectedChartType);
      if (chartGroup && chartGroup.tiles[tileId]) {
        const firstVisualization = chartGroup.tiles[tileId].timestamps[0];
        setSelectedVisualization(firstVisualization);
      }
    }
  };

  // Handle timestamp selection
  const handleTimestampSelect = (visualization: VisualizationItem) => {
    setSelectedVisualization(visualization);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleRefresh = async () => {
    if (!selectedRegion?.id) return;
    
    setRefreshing(true);
    await loadVisualizations(selectedRegion.id);
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    // Convert timestamp format "20250630-130221" to readable date
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    return date.toLocaleString();
  };

  // Navigation functions
  const navigateVisualization = (direction: 'prev' | 'next') => {
    if (!selectedChartType || !selectedTileId || !selectedVisualization) return;
    
    const chartGroup = groupedVisualizations.find(g => g.chartType === selectedChartType);
    if (!chartGroup) return;
    
    const currentTimestamps = chartGroup.tiles[selectedTileId].timestamps;
    const currentIndex = currentTimestamps.findIndex(v => 
      v.timestamp === selectedVisualization.timestamp && v.tileId === selectedVisualization.tileId
    );
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentTimestamps.length - 1;
    } else {
      newIndex = currentIndex < currentTimestamps.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedVisualization(currentTimestamps[newIndex]);
  };

  if (!selectedRegion) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm max-w-md">
          <ScatterChart size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">K-Means Clustering Visualizations</h3>
          <p className="text-sm text-gray-600 mb-4">
            View clustering analysis results including NDVI scatter plots, geographic distributions, and feature histograms.
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
            <strong>Select a region</strong> from the map or regions list to view available clustering visualizations.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-blue-600"/>
          <h3 className="text-lg font-semibold text-gray-800">Loading Visualizations</h3>
          <p className="text-sm text-gray-600">Fetching clustering analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center text-red-600 max-w-md">
          <AlertTriangle size={40} className="mx-auto mb-3"/>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Visualizations</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => selectedRegion?.id && loadVisualizations(selectedRegion.id)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!visualizations || groupedVisualizations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm max-w-md">
          <Image size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Visualizations Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            No clustering analysis visualizations found for region <strong>{selectedRegion.name}</strong>.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  const selectedChartGroup = groupedVisualizations.find(g => g.chartType === selectedChartType);
  const availableTiles = selectedChartGroup ? Object.keys(selectedChartGroup.tiles) : [];
  const availableTimestamps = selectedChartGroup && selectedTileId ? selectedChartGroup.tiles[selectedTileId].timestamps : [];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <img src="/aws-icons/sagemaker.svg" alt="Sagemaker" className="w-12 h-12 mb-2" />
            <h3 className="text-lg font-semibold text-gray-800">K-Means Clustering Visualizations</h3>
            <p className="text-sm text-gray-600">
              Region: <strong>{selectedRegion.name}</strong>
              {selectedVisualization && (
                <span className="ml-3 text-gray-500">
                  <Calendar size={12} className="inline mr-1" />
                  {formatTimestamp(selectedVisualization.timestamp)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh visualizations"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Multi-level Selector */}
          <div className="bg-white border-b border-gray-200 p-4 space-y-3">
            {/* Chart Type Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">CHART TYPE</label>
              <div className="flex items-center gap-2 overflow-x-auto">
                {groupedVisualizations.map((chartGroup) => {
                  const metadata = CHART_METADATA[chartGroup.chartType as keyof typeof CHART_METADATA];
                  const isSelected = selectedChartType === chartGroup.chartType;
                  
                                       return (
                       <button
                         key={chartGroup.chartType}
                         onClick={() => handleChartTypeSelect(chartGroup.chartType)}
                         disabled={imageLoading && isSelected}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                           isSelected
                             ? `${metadata?.color || 'bg-blue-100 text-blue-700'} border border-blue-300`
                             : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                         } ${imageLoading && isSelected ? 'opacity-75' : ''}`}
                       >
                         {imageLoading && isSelected ? (
                           <Loader2 size={14} className="animate-spin" />
                         ) : (
                           metadata?.icon || <Image size={14} />
                         )}
                         {chartGroup.chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                         <span className="ml-1 text-xs opacity-75">
                           ({Object.keys(chartGroup.tiles).length})
                         </span>
                       </button>
                     );
                })}
              </div>
            </div>

            {/* Tile Selector */}
            {selectedChartType && availableTiles.length > 1 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">SATELLITE TILE</label>
                <div className="flex items-center gap-2">
                  {availableTiles.map((tileId) => {
                    const isSelected = selectedTileId === tileId;
                    const tileGroup = selectedChartGroup?.tiles[tileId];
                    const timestampCount = tileGroup ? tileGroup.timestamps.length : 0;
                    
                                         return (
                       <button
                         key={tileId}
                         onClick={() => handleTileSelect(tileId)}
                         disabled={imageLoading && isSelected}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                           isSelected
                             ? 'bg-blue-100 text-blue-700 border border-blue-300'
                             : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                         } ${imageLoading && isSelected ? 'opacity-75' : ''}`}
                       >
                         {imageLoading && isSelected && (
                           <Loader2 size={12} className="animate-spin mr-1" />
                         )}
                         {tileId}
                         <span className="ml-1 text-xs opacity-75">
                           ({timestampCount})
                         </span>
                       </button>
                     );
                  })}
                </div>
              </div>
            )}

            {/* Timestamp Selector */}
            {selectedChartType && selectedTileId && availableTimestamps.length > 1 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">PROCESSING TIME</label>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {availableTimestamps.map((viz) => {
                    const isSelected = selectedVisualization?.timestamp === viz.timestamp;
                    
                                         return (
                       <button
                         key={`${viz.tileId}-${viz.timestamp}`}
                         onClick={() => handleTimestampSelect(viz)}
                         disabled={imageLoading && isSelected}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                           isSelected
                             ? 'bg-green-100 text-green-700 border border-green-300'
                             : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                         } ${imageLoading && isSelected ? 'opacity-75' : ''}`}
                       >
                         {imageLoading && isSelected && (
                           <Loader2 size={12} className="animate-spin" />
                         )}
                         {formatTimestamp(viz.timestamp)}
                       </button>
                     );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Visualization Display */}
          <div className="flex-1 p-4 overflow-auto">
            {selectedVisualization && selectedChartGroup ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Chart Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {selectedVisualization.chartType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedVisualization.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Tile: <strong>{selectedVisualization.tileId}</strong></span>
                        <span>Processed: <strong>{formatTimestamp(selectedVisualization.timestamp)}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                                             {/* Navigation */}
                       {availableTimestamps.length > 1 && (
                         <div className="flex items-center border border-gray-300 rounded">
                           <button
                             onClick={() => navigateVisualization('prev')}
                             disabled={imageLoading}
                             className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Previous timestamp"
                           >
                             <ChevronLeft size={16} />
                           </button>
                           <span className="px-2 text-sm text-gray-600 border-x border-gray-300">
                             {imageLoading ? (
                               <Loader2 size={12} className="animate-spin" />
                             ) : (
                               `${availableTimestamps.findIndex(v => v.timestamp === selectedVisualization.timestamp) + 1} of ${availableTimestamps.length}`
                             )}
                           </span>
                           <button
                             onClick={() => navigateVisualization('next')}
                             disabled={imageLoading}
                             className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Next timestamp"
                           >
                             <ChevronRight size={16} />
                           </button>
                         </div>
                       )}
                      
                      {/* Actions */}
                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        title="View fullscreen"
                      >
                        <Maximize2 size={16} />
                      </button>
                      
                      <a
                        href={selectedVisualization.url}
                        download={`${selectedVisualization.chartType}-${selectedVisualization.tileId}-${selectedVisualization.timestamp}.png`}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        title="Download image"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Chart Image */}
                <div className="p-4">
                  <div className="relative bg-gray-50 rounded-lg border border-gray-200 min-h-[400px] flex items-center justify-center">
                    {/* Loading Overlay */}
                    {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-gray-50 z-10">
                        <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
                        <p className="text-sm text-gray-600">Loading visualization...</p>
                      </div>
                    )}
                    
                    {/* Error State */}
                    {imageError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-gray-50 z-10">
                        <AlertTriangle size={32} className="text-red-500 mb-3" />
                        <p className="text-sm text-gray-600 mb-2">Failed to load visualization</p>
                        <button
                          onClick={() => {
                            setImageLoading(true);
                            setImageError(false);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    
                    {/* Image - Always rendered so onLoad/onError events can fire */}
                    <img
                      src={selectedVisualization.url}
                      alt={selectedVisualization.chartType}
                      className="max-w-full max-h-full object-contain rounded"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <Eye size={32} className="mx-auto mb-3 text-gray-400" />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Select a Visualization</h4>
                <p className="text-sm text-gray-600">Choose a chart type to view the clustering analysis results.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && selectedVisualization && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X size={20} />
            </button>
            
            {/* Loading Overlay */}
            {imageLoading && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-sm">Loading visualization...</p>
              </div>
            )}
            
            {/* Error Overlay */}
            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <AlertTriangle size={40} className="text-red-400 mb-4" />
                <p className="text-sm mb-4">Failed to load visualization</p>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Close
                </button>
              </div>
            )}
            
            {/* Image - Always rendered */}
            <img
              src={selectedVisualization.url}
              alt={selectedVisualization.chartType}
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
} 