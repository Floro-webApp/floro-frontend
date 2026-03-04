'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Loader2, AlertCircle, Database, Zap } from 'lucide-react';
import { useYieldPrediction, YieldPredictionInput } from '@/hooks/useYieldPrediction';
import { useYieldPredictionData } from '@/hooks/useYieldPredictionData';

interface YieldPredictionPanelProps {
  regionId?: string;
  tileId?: string;
  latitude?: number;
  longitude?: number;
  ndvi?: number;
  onPredictionComplete?: (result: any) => void;
}

export default function YieldPredictionPanel({
  regionId,
  tileId,
  latitude,
  longitude,
  ndvi = 0.65,
  onPredictionComplete,
}: YieldPredictionPanelProps) {
  const { prediction, loading: predicting, error, predict, setError } =
    useYieldPrediction();

  // Fetch real-time data from backend
  const {
    data: realTimeData,
    loading: fetchingData,
    error: dataError,
    refresh: refreshData,
    isCached,
    lastFetchTime,
  } = useYieldPredictionData({
    latitude,
    longitude,
    tileId,
    regionId,
    autoFetch: true,
  });

  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [formData, setFormData] = useState<YieldPredictionInput>({
    ndvi: realTimeData.satellite.ndvi,
    rainfall: realTimeData.weather.rainfall,
    temperature: realTimeData.weather.temperature,
    soilPH: realTimeData.soil.soilPH,
    nitrogen: realTimeData.soil.nitrogen,
    phosphorus: realTimeData.soil.phosphorus,
    potassium: realTimeData.soil.potassium,
    cropType: 'wheat',
    season: 'spring',
    tileId: tileId || 'unknown',
  });

  // Update form data when real-time data arrives
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ndvi: realTimeData.satellite.ndvi,
      rainfall: realTimeData.weather.rainfall,
      temperature: realTimeData.weather.temperature,
      soilPH: realTimeData.soil.soilPH,
      nitrogen: realTimeData.soil.nitrogen,
      phosphorus: realTimeData.soil.phosphorus,
      potassium: realTimeData.soil.potassium,
    }));
  }, [realTimeData]);

  const handleInputChange = (
    field: keyof YieldPredictionInput,
    value: number | string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]:
        typeof value === 'string' ? (isNaN(Number(value)) ? value : parseFloat(value)) : value,
    }));
  };

  const handlePredict = async () => {
    try {
      setError(null);
      const result = await predict(formData);
      setActiveTab('results');
      if (onPredictionComplete) {
        onPredictionComplete(result);
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    }
  };

  const getSourceBadge = (source: string, status: string) => {
    const colors = {
      'Sentinel-2': 'bg-blue-100 text-blue-800',
      'AWS DynamoDB': 'bg-purple-100 text-purple-800',
      'Default': 'bg-gray-100 text-gray-800',
    };
    const statusIcons = {
      'success': '✓',
      'fallback': '⚠',
      'loading': '⏳',
      'error': '✕',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[source as keyof typeof colors] || colors['Default']}`}>
        {statusIcons[status as keyof typeof statusIcons]} {source}
      </span>
    );
  };

  const getFieldWithSource = (
    label: string,
    value: number,
    source: string,
    status: string,
    icon: React.ReactNode,
  ) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label}
        </label>
        {getSourceBadge(source, status)}
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => handleInputChange(label.toLowerCase().replace(/\s+/g, '') as any, e.target.value)}
        className="text-xs"
      />
    </div>

  );

  const loading = fetchingData || predicting;
  const isDataReady = realTimeData.status !== 'loading';

  return (
    <Card className="h-[90vh] max-h-[90vh] flex flex-col relative">
      <CardContent className="flex-1 overflow-y-auto space-y-4 p-2 sm:p-5 min-h-0">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'input'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            Input Data
          </button>
          {prediction && (
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === 'results'
                  ? 'bg-white text-green-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Results
            </button>
          )}
        </div>

        {activeTab === 'input' && (
          <div className="space-y-4">
            {/* Real-time Data Status */}
            {(fetchingData || dataError) && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                dataError ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                {fetchingData ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-800">Loading real-time satellite data...</span>
                  </>
                ) : dataError ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-800">Using fallback data (API error)</span>
                  </>
                ) : null}
              </div>
            )}

            {/* Last Updated Info */}
            {isDataReady && (
              <div className="text-xs text-gray-500 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-2 rounded gap-2">
                <span>Last updated: {new Date(lastFetchTime).toLocaleTimeString()}</span>
                <button
                  onClick={() => refreshData()}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            )}

            {/* Input Form - Grouped by Category */}
            <div className="space-y-4">
              {/* Your Field's Health */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-sm text-green-900 mb-3 flex items-center gap-2">
                  🌱 Your Field's Health
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getFieldWithSource(
                    'Plant Vigor (NDVI)',
                    formData.ndvi,
                    realTimeData.satellite.source,
                    realTimeData.satellite.status,
                    '🌿',
                  )}
                  {getFieldWithSource(
                    'Water Received (mm)',
                    formData.rainfall,
                    realTimeData.weather.source,
                    realTimeData.weather.status,
                    '💧',
                  )}
                  {getFieldWithSource(
                    'Temperature (°C)',
                    formData.temperature,
                    realTimeData.weather.source,
                    realTimeData.weather.status,
                    '🌡',
                  )}
                  {getFieldWithSource(
                    'Soil Acidity (pH)',
                    formData.soilPH ?? 0,
                    realTimeData.soil.source,
                    realTimeData.soil.status,
                    '🧪',
                  )}
                </div>
              </div>

              {/* Soil Nutrients */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-sm text-orange-900 mb-3 flex items-center gap-2">
                  🥬 Soil Nutrients
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    {getFieldWithSource(
                      'Nitrogen %',
                      formData.nitrogen ?? 0,
                      realTimeData.soil.source,
                      realTimeData.soil.status,
                      'N',
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {getFieldWithSource(
                      'Phosphorus %',
                      formData.phosphorus ?? 0,
                      realTimeData.soil.source,
                      realTimeData.soil.status,
                      'P',
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {getFieldWithSource(
                      'Potassium %',
                      formData.potassium ?? 0,
                      realTimeData.soil.source,
                      realTimeData.soil.status,
                      'K',
                    )}
                  </div>
                </div>
              </div>

              {/* Crop Selection */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                <h3 className="font-semibold text-sm text-indigo-900 mb-3 flex items-center gap-2">
                  🌾 What are you growing?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Crop Type</label>
                    <Select
                      value={formData.cropType}
                      onValueChange={(v) => handleInputChange('cropType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wheat">Wheat</SelectItem>
                        <SelectItem value="rice">Rice</SelectItem>
                        <SelectItem value="maize">Maize</SelectItem>
                        <SelectItem value="soybean">Soybean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Growing Season</label>
                    <Select
                      value={formData.season}
                      onValueChange={(v) => handleInputChange('season', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Failed to load initial region data.</div>
                  <div className="text-xs mt-1">{error}</div>
                  <ul className="text-xs mt-2 list-disc pl-5 space-y-1">
                    <li>Make sure the backend server is running at <code>http://localhost:3001</code>.</li>
                    <li>Check your network connection and firewall settings.</li>
                    <li>Ensure region, latitude, or tile information is provided.</li>
                    <li>Try refreshing the page or contact support if the issue persists.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Predict Button inside scrollable panel */}
            <div className="pt-2 pb-4">
              <Button
                onClick={handlePredict}
                disabled={loading || !isDataReady}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing your field...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    🎯 Predict Yield
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && prediction && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-400 p-4 sm:p-6 rounded-lg">
              <p className="text-sm text-green-700 mb-2">🎉 Your Expected Harvest</p>
              <p className="text-4xl font-bold text-emerald-700">
                {prediction.predictedYield.toFixed(1)} t/ha
              </p>
              <p className="text-sm text-green-600 mt-1">
                Confidence: {(prediction.confidence * 100).toFixed(0)}%
              </p>
            </div>

            {/* Risk Assessment */}
            <div className={`p-3 sm:p-4 rounded-lg border-2 ${
              prediction.riskAssessment.riskLevel === 'CRITICAL'
                ? 'bg-red-50 border-red-400'
                : prediction.riskAssessment.riskLevel === 'HIGH'
                  ? 'bg-orange-50 border-orange-400'
                  : prediction.riskAssessment.riskLevel === 'MEDIUM'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-green-50 border-green-400'
            }`}>
              <p className="font-semibold text-sm mb-2">
                {prediction.riskAssessment.riskLevel === 'CRITICAL' && '🚨 Be Careful'}
                {prediction.riskAssessment.riskLevel === 'HIGH' && '⚠️ Be Cautious'}
                {prediction.riskAssessment.riskLevel === 'MEDIUM' && '👍 Moderate'}
                {prediction.riskAssessment.riskLevel === 'LOW' && '✅ Looking Good'}
              </p>
              <p className="text-sm">{prediction.riskAssessment.recommendation}</p>
            </div>

            {/* How We Got Here - Analysis */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <p className="font-semibold text-sm mb-3">📊 How we got here</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>🌱 Plant Health:</span>
                  <span className="font-medium">{prediction.riskAssessment.factors.ndviHealth}</span>
                </div>
                <div className="flex justify-between">
                  <span>💧 Water Supply:</span>
                  <span className="font-medium">{prediction.riskAssessment.factors.waterAvailability}</span>
                </div>
                <div className="flex justify-between">
                  <span>🌡 Temperature:</span>
                  <span className="font-medium">{prediction.riskAssessment.factors.temperatureStress}</span>
                </div>
                <div className="flex justify-between">
                  <span>🥬 Soil Condition:</span>
                  <span className="font-medium">{prediction.riskAssessment.factors.soilCondition}</span>
                </div>
              </div>
            </div>

            {/* Input Summary */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="font-semibold text-sm mb-3">📋 Your Field Data</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>🌱 Plant Health: {prediction.inputFeatures.ndvi.toFixed(2)}</div>
                <div>💧 Water: {prediction.inputFeatures.rainfall}mm</div>
                <div>🌡 Temperature: {prediction.inputFeatures.temperature}°C</div>
                <div>🧪 Soil pH: {prediction.inputFeatures.soilPH.toFixed(1)}</div>
                <div>💚 Nitrogen: {(prediction.inputFeatures.nitrogen * 100).toFixed(1)}%</div>
                <div>💛 Phosphorus: {(prediction.inputFeatures.phosphorus * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setActiveTab('input')}
                variant="outline"
                className="flex-1"
              >
                Try different inputs
              </Button>
              <Button
                onClick={() => handlePredict()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Predict again
              </Button>
            </div>
          </div>
        )}
      </CardContent>

    </Card>
  );

}
