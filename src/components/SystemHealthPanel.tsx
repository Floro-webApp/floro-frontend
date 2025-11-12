'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '../lib/api';

interface HealthMetric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable';
}

interface LambdaFunction {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  invocations: number;
  duration: number;
  memory: number;
  errors: number;
  sparklineData: number[];
}

// Remove mock data generation functions - use real API data only

const SparklineChart = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-blue-500"
      />
    </svg>
  );
};

const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
  switch (status) {
    case 'healthy': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getStatusBg = (status: 'healthy' | 'warning' | 'critical') => {
  switch (status) {
    case 'healthy': return 'bg-green-50 border-green-200';
    case 'warning': return 'bg-yellow-50 border-yellow-200';
    case 'critical': return 'bg-red-50 border-red-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const fetcher = () => api.getSystemHealth();

export default function SystemHealthPanel() {
  const [isLive, setIsLive] = useState(true);
  
  const { data, error, isLoading } = useSWR('system-health', fetcher, {
    refreshInterval: isLive ? 10000 : 0, // Refresh every 10 seconds when live
    revalidateOnFocus: false
  });

  // Convert API data to expected format
  const healthMetrics: HealthMetric[] = data ? [
    {
      id: 'overall-health',
      name: 'Overall Health',
      value: data.overall_health || 'unknown',
      status: data.overall_health === 'healthy' ? 'healthy' : 'warning',
      description: 'System-wide health status'
    },
    {
      id: 'cpu-usage',
      name: 'CPU Usage',
      value: data.resource_utilization?.cpu_usage || 0,
      unit: '%',
      status: (data.resource_utilization?.cpu_usage || 0) > 80 ? 'critical' : 
             (data.resource_utilization?.cpu_usage || 0) > 60 ? 'warning' : 'healthy',
      description: 'System CPU utilization'
    },
    {
      id: 'memory-usage',
      name: 'Memory Usage',
      value: data.resource_utilization?.memory_usage || 0,
      unit: '%',
      status: (data.resource_utilization?.memory_usage || 0) > 80 ? 'critical' : 
             (data.resource_utilization?.memory_usage || 0) > 60 ? 'warning' : 'healthy',
      description: 'System memory utilization'
    },
    {
      id: 'disk-usage',
      name: 'Disk Usage',
      value: data.resource_utilization?.disk_usage || 0,
      unit: '%',
      status: (data.resource_utilization?.disk_usage || 0) > 80 ? 'critical' : 
             (data.resource_utilization?.disk_usage || 0) > 60 ? 'warning' : 'healthy',
      description: 'Storage utilization'
    }
  ] : [];

  const lambdaFunctions: LambdaFunction[] = data?.lambda_functions ? 
    Object.entries(data.lambda_functions).map(([name, status]) => ({
      name: name.replace('forestshield-', ''),
      status: status === 'healthy' ? 'healthy' : 'warning',
      invocations: 0, // Real data would come from CloudWatch metrics
      duration: 0,
      memory: 512,
      errors: status === 'healthy' ? 0 : 1,
      sparklineData: [] // Real sparkline data would come from CloudWatch metrics
    })) : [];

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold mb-2">Failed to Load System Health</h2>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">System Health</h2>
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

      {/* Health Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {healthMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`p-3 border rounded-lg ${getStatusBg(metric.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">{metric.name}</h3>
              <div className={`w-2 h-2 rounded-full ${
                metric.status === 'healthy' ? 'bg-green-500' : 
                metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
              {metric.unit && <span className="text-sm text-gray-600 ml-1">{metric.unit}</span>}
            </div>
            <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* AWS Services */}
      {data?.aws_services && (
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-800">AWS Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data.aws_services).map(([service, status]) => (
              <div
                key={service}
                className={`p-3 border rounded-lg ${
                  status === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{service}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>
                <p className="text-xs text-gray-600 mt-1 capitalize">{status as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lambda Functions */}
      {lambdaFunctions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-800">Lambda Functions</h3>
          <div className="space-y-3">
            {lambdaFunctions.map((func) => (
              <div
                key={func.name}
                className={`p-3 border rounded-lg ${getStatusBg(func.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 capitalize">{func.name}</h4>
                  <div className={`w-2 h-2 rounded-full ${
                    func.status === 'healthy' ? 'bg-green-500' : 
                    func.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Invocations:</span>
                    <div className="font-medium">{func.invocations}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium">{func.duration}ms</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Memory:</span>
                    <div className="font-medium">{func.memory}MB</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Errors:</span>
                    <div className={`font-medium ${func.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {func.errors}
                    </div>
                  </div>
                </div>
                {func.sparklineData && (
                  <div className="mt-2 h-8">
                    <SparklineChart data={func.sparklineData} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {data?.last_check && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(data.last_check).toLocaleString()}
        </div>
      )}
    </div>
  );
} 