'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { api, Region } from '../lib/api';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Eye
} from 'lucide-react';

interface RegionsListPanelProps {
  selectedRegion?: Region | null;
  onRegionSelected: (region: Region) => void;
}

const fetcher = () => api.getRegions();

export default function RegionsListPanel({ selectedRegion, onRegionSelected }: RegionsListPanelProps) {
  const { data: regions, error, isLoading, mutate } = useSWR('regions-list', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'MONITORING'>('ALL');

  const filteredRegions = useMemo(() => {
    if (!regions) return [];
    
    return regions.filter(region => {
      const matchesSearch = region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           region.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || region.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [regions, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    await mutate();
  };

  const getStatusIcon = (status: Region['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PAUSED':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'MONITORING':
        return <Activity className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Region['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'MONITORING':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDeforestationColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-500';
    if (percentage > 15) return 'text-red-600';
    if (percentage > 8) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Regions</h3>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-600">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mb-4 mx-auto" />
            <p className="text-lg font-semibold">Failed to load regions</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Regions ({filteredRegions.length})
        </h3>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="p-3 border-b bg-gray-50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search regions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'PAUSED', 'MONITORING'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Regions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-500">Loading regions...</p>
            </div>
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">No regions found</p>
              {searchTerm && (
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredRegions.map((region) => (
              <Card 
                key={region.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedRegion?.id === region.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onRegionSelected(region)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-900 truncate" title={region.name}>
                        {region.name}
                      </h4>
                      <p className="text-xs text-gray-600 truncate" title={region.description}>
                        {region.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {selectedRegion?.id === region.id && (
                        <Eye className="w-4 h-4 text-blue-600" />
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(region.status)}`}>
                        {getStatusIcon(region.status)}
                        {region.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{region.latitude.toFixed(3)}, {region.longitude.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>{region.radiusKm}km radius</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">
                        Created {new Date(region.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {region.lastDeforestationPercentage !== undefined && (
                      <div className={`text-xs font-semibold ${getDeforestationColor(region.lastDeforestationPercentage)}`}>
                        {region.lastDeforestationPercentage.toFixed(1)}% deforestation
                      </div>
                    )}
                  </div>

                  {region.lastAnalysis && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last analyzed: {new Date(region.lastAnalysis).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 