import { useState, useEffect, useCallback } from 'react';

export interface YieldPredictionData {
  satellite: {
    ndvi: number;
    source: string;
    acquisitionDate: string;
    cloudCover: number;
    vegetationPercentage: number;
    tileId: string;
    status: 'success' | 'fallback' | 'loading' | 'error';
  };
  weather: {
    temperature: number;
    rainfall: number;
    humidity: number;
    windSpeed: number;
    source: string;
    timestamp: string;
    status: 'success' | 'fallback' | 'loading' | 'error';
  };
  soil: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    soilPH: number;
    source: string;
    lastUpdated: string;
    status: 'success' | 'fallback' | 'loading' | 'error';
  };
  timestamp: string;
  status: 'loading' | 'success' | 'error';
}

export interface UseYieldPredictionDataOptions {
  latitude?: number;
  longitude?: number;
  tileId?: string;
  regionId?: string;
  autoFetch?: boolean;
  cacheDuration?: number; // milliseconds
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const DEFAULT_DATA: YieldPredictionData = {
  satellite: {
    ndvi: 0.65,
    source: 'Default',
    acquisitionDate: new Date().toISOString(),
    cloudCover: 15,
    vegetationPercentage: 65,
    tileId: 'unknown',
    status: 'loading',
  },
  weather: {
    temperature: 22,
    rainfall: 600,
    humidity: 75,
    windSpeed: 8.5,
    source: 'Default',
    timestamp: new Date().toISOString(),
    status: 'loading',
  },
  soil: {
    nitrogen: 0.15,
    phosphorus: 0.05,
    potassium: 0.15,
    soilPH: 6.5,
    source: 'Default',
    lastUpdated: new Date().toISOString(),
    status: 'loading',
  },
  timestamp: new Date().toISOString(),
  status: 'loading',
};

export function useYieldPredictionData(
  options: UseYieldPredictionDataOptions = {},
) {
  const {
    latitude,
    longitude,
    tileId,
    regionId,
    autoFetch = true,
    cacheDuration = DEFAULT_CACHE_DURATION,
  } = options;

  const [data, setData] = useState<YieldPredictionData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isCached, setIsCached] = useState(false);

  const cacheKey = `yield-data-${latitude}-${longitude}-${tileId}-${regionId}`;

  // Check cache
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < cacheDuration) {
          setData(cachedData);
          setLastFetchTime(timestamp);
          setIsCached(true);
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve cached data:', err);
    }
    return false;
  }, [cacheKey, cacheDuration]);

  // Fetch real-time data
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh && getCachedData()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (latitude !== undefined) params.append('lat', latitude.toString());
      if (longitude !== undefined) params.append('lng', longitude.toString());
      if (tileId) params.append('tileId', tileId);
      if (regionId) params.append('regionId', regionId);

      const response = await fetch(
        `http://localhost:3001/yield/all-data?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const newData = await response.json();

      // Merge with defaults to ensure all fields are present
      const mergedData: YieldPredictionData = {
        satellite: { ...DEFAULT_DATA.satellite, ...newData.satellite },
        weather: { ...DEFAULT_DATA.weather, ...newData.weather },
        soil: { ...DEFAULT_DATA.soil, ...newData.soil },
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      setData(mergedData);
      setLastFetchTime(Date.now());
      setIsCached(false);

      // Cache the data
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: mergedData,
            timestamp: Date.now(),
          }),
        );
      } catch (cacheErr) {
        console.warn('Failed to cache data:', cacheErr);
      }
    } catch (err) {
      console.error('Failed to fetch real-time data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Keep existing data even if fetch fails
      setData((prev) => ({
        ...prev,
        status: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, tileId, regionId, getCachedData]);

  // Auto-fetch on mount or when params change
  useEffect(() => {
    if (autoFetch && (latitude !== undefined || longitude !== undefined || tileId || regionId)) {
      fetchData();
    }
  }, [latitude, longitude, tileId, regionId, autoFetch, fetchData]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Function to check if data is fresh
  const isDataFresh = useCallback(() => {
    return Date.now() - lastFetchTime < cacheDuration;
  }, [lastFetchTime, cacheDuration]);

  return {
    data,
    loading,
    error,
    refresh,
    isDataFresh,
    isCached,
    lastFetchTime,
    // Convenience accessors
    ndvi: data.satellite.ndvi,
    temperature: data.weather.temperature,
    rainfall: data.weather.rainfall,
    nitrogen: data.soil.nitrogen,
    phosphorus: data.soil.phosphorus,
    potassium: data.soil.potassium,
    soilPH: data.soil.soilPH,
  };
}
