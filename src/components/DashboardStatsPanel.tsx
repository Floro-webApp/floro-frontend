'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api, DashboardStats } from '../lib/api';

// StatItem with label in top left, padding, and uppercase
const StatItem = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  icon: string;
  valueColor?: string;
}) => (
  <div className="flex flex-col min-w-30 justify-center px-6 py-3 h-full border-r border-gray-700 first:border-l relative">
    <p className="absolute top-2 left-4 text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="flex flex-row items-center mt-5">
      <p className={`text-base font-bold ${valueColor || 'text-white'}`}>{value}</p>
    </div>
  </div>
);

// Real-time sparkline chart component using actual metrics
const SparklineChart = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-blue-400"
      />
    </svg>
  );
};

const fetcher = () => api.getDashboardStats();

export default function DashboardStatsPanel({ className }: { className?: string }) {
  const [isLive, setIsLive] = useState(true);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  
  const { data: stats, error, isLoading } = useSWR('dashboard-stats', fetcher, {
    refreshInterval: isLive ? 2000 : 0, // Refresh every 2 seconds when live
    revalidateOnFocus: false
  });

  // Update sparkline with real activity data
  useEffect(() => {
    if (!isLive || !stats) return;
    const interval = setInterval(() => {
      // Use real metrics for sparkline - active jobs as activity indicator
      const activityValue = stats.activeJobs || 0;
      setSparklineData((prev: number[]) => {
        const newData = [...prev.slice(-39), activityValue]; // Keep last 40 points
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, stats]);

  // Default stats for loading state
  const displayStats = stats || {
    totalRegions: 0,
    activeAlerts: 0,
    activeJobs: 0,
    lastUpdate: new Date().toISOString()
  };

  const lastUpdateTime = new Date(displayStats.lastUpdate).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  return (
    <div className={`bg-[#232f3e] border-b border-black/50 px-4 h-[60px] flex items-center justify-between text-white shadow-md ${className}`}>
      <div className="flex items-center h-full">
        <h1 className="text-lg font-bold text-white pr-6">Forest Shield</h1>
        <div className="flex h-full">
            <StatItem 
              label="System Status" 
              value={error ? "Error" : isLoading ? "Loading" : "Healthy"} 
              icon="✅" 
              valueColor={error ? "text-red-400" : isLoading ? "text-yellow-400" : "text-green-400"} 
            />
            <StatItem label="Regions" value={displayStats.totalRegions} icon="🌍" />
            <StatItem 
              label="Active Alerts" 
              value={displayStats.activeAlerts} 
              icon="⚠️"
              valueColor={displayStats.activeAlerts > 0 ? "text-yellow-400" : "text-green-400"}
            />
            <StatItem label="Active Jobs" value={displayStats.activeJobs} icon="⚙️" />
        </div>
      </div>
      
      <div className="flex items-center gap-4 h-full">
        <div className="flex flex-col items-end pr-4 border-r border-gray-700 h-full justify-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider top-2 relative">Analysis Activity</p>
            <div className="w-32 h-8 mt-1">
                <SparklineChart data={sparklineData} />
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
           <span className="text-gray-400">Last Sync:</span>
           <span className="font-mono text-sm">{lastUpdateTime}</span>
        </div>
        <div 
          onClick={() => setIsLive(!isLive)}
          className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider">{isLive ? 'Live' : 'Paused'}</span>
        </div>
      </div>
    </div>
  );
} 