'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '../lib/api';
import { DollarSign, TrendingUp, TrendingDown, Server, Cpu, Database, Zap } from 'lucide-react';

// This interface matches the actual API response from /dashboard/aws/costs
interface AWSCostResponse {
  dailyCosts: { date: string; amount: number }[];
  monthlyProjection: number;
  currentMonth: number;
  previousMonth: number;
  usageMetrics: {
    lambdaInvocations?: number;
    s3Requests?: number;
    dataTransferGB?: number;
    computeHours?: number;
    [key: string]: number | undefined; // Allow other keys
  };
}

const fetcher = (): Promise<AWSCostResponse> => api.getAWSCostData();

export default function AWSCostMonitor() {
  const [isLive, setIsLive] = useState(true);
  
  const { data, error, isLoading } = useSWR('aws-costs', fetcher, {
    refreshInterval: isLive ? 60000 : 0,
    revalidateOnFocus: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const costTrend = data ? (data.currentMonth / (new Date().getDate() / 30)) - data.previousMonth : 0;
  
  const usageMetrics = data?.usageMetrics ? Object.entries(data.usageMetrics)
    .map(([key, value]) => {
      let icon = <Server size={18} className="text-gray-500" />;
      let name = key;
      if (key.toLowerCase().includes('lambda')) {
        icon = <Zap size={18} className="text-purple-500" />;
        name = "Lambda Invocations";
      } else if (key.toLowerCase().includes('s3')) {
        icon = <Database size={18} className="text-blue-500" />;
        name = "S3 Requests";
      } else if (key.toLowerCase().includes('compute')) {
        icon = <Cpu size={18} className="text-orange-500" />;
        name = "Compute Hours";
      }
      return { name, value, icon };
    })
    .filter(item => item.value !== undefined) : [];

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Cost Data</h2>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">AWS Cost Monitor</h2>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            isLive 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isLive ? 'Live' : 'Paused'}
        </button>
      </div>

      {/* Cost Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Current Month</h3>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(data?.currentMonth || 0)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-800 mb-1">Projected</h3>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(data?.monthlyProjection || 0)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-1">vs. Last Month</h3>
            <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${costTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {costTrend >= 0 ? '+' : ''}{formatCurrency(costTrend)}
                </p>
                {costTrend > 0 ? <TrendingUp className="text-red-600" /> : <TrendingDown className="text-green-600" />}
            </div>
        </div>
      </div>

      {/* Usage Metrics Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Usage Metrics</h3>
        {usageMetrics.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {usageMetrics.map(metric => (
              metric.value && (
                <div key={metric.name} className="bg-gray-50 p-3 rounded-lg flex items-start gap-3">
                  {metric.icon}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{metric.name}</h4>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(metric.value)}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No usage metrics available.</p>
          </div>
        )}
      </div>
    </div>
  );
} 