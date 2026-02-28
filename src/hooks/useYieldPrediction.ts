import { useState, useCallback } from 'react';

export interface YieldPredictionInput {
  ndvi: number;
  rainfall: number;
  temperature: number;
  soilType?: string;
  tileId?: string;
  soilPH?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  cropType?: string;
  season?: string;
}

export interface RiskFactors {
  ndviHealth: string;
  waterAvailability: string;
  temperatureStress: string;
  soilCondition: string;
}

export interface RiskAssessment {
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  factors: RiskFactors;
}

export interface InputFeatures {
  ndvi: number;
  rainfall: number;
  temperature: number;
  soilPH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface YieldPredictionResult {
  predictedYield: number;
  unit: string;
  confidence: number;
  riskAssessment: RiskAssessment;
  inputFeatures: InputFeatures;
  timestamp: string;
}

export interface HistoricalYieldRecord {
  tileId: string;
  timestamp: string;
  ndvi: number;
  rainfall: number;
  temperature: number;
  predictedYield: number;
  confidence: number;
  cropType?: string;
  season?: string;
}

export interface HistoricalYieldResponse {
  tileId: string;
  predictions: HistoricalYieldRecord[];
  count: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useYieldPrediction() {
  const [prediction, setPrediction] = useState<YieldPredictionResult | null>(null);
  const [historical, setHistorical] = useState<HistoricalYieldResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(
    async (input: YieldPredictionInput) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/yield/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data: YieldPredictionResult = await response.json();
        setPrediction(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Yield prediction failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getHistorical = useCallback(
    async (tileId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/yield/historical/${tileId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: HistoricalYieldResponse = await response.json();
        setHistorical(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch historical data';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    prediction,
    historical,
    loading,
    error,
    predict,
    getHistorical,
    setPrediction,
    setError,
  };
}
