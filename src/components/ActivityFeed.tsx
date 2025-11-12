'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '../lib/api';

interface Activity {
  id: string;
  type: 'analysis' | 'alert' | 'region' | 'system' | 'error';
  message: string;
  timestamp: string;
  service?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'analysis': return '🔍';
    case 'alert': return '🚨';
    case 'region': return '🗺️';
    case 'system': return '⚙️';
    case 'error': return '❌';
    default: return '📋';
  }
};

const getSeverityColor = (severity: Activity['severity']) => {
  switch (severity) {
    case 'low': return 'text-gray-600';
    case 'medium': return 'text-blue-600';
    case 'high': return 'text-orange-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getSeverityBg = (severity: Activity['severity']) => {
  switch (severity) {
    case 'low': return 'bg-gray-50 border-l-gray-300';
    case 'medium': return 'bg-blue-50 border-l-blue-300';
    case 'high': return 'bg-orange-50 border-l-orange-300';
    case 'critical': return 'bg-red-50 border-l-red-300';
    default: return 'bg-gray-50 border-l-gray-300';
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

// const fetcher = () => api.getActivityFeed(50);
const fetcher = () => Promise.resolve({ activities: [] });

export default function ActivityFeed() {
  const [isLive, setIsLive] = useState(true);
  
  const { data, error, isLoading, mutate } = useSWR('activity-feed', fetcher, {
    refreshInterval: isLive ? 5000 : 0, // Refresh every 5 seconds when live
    revalidateOnFocus: false
  });

  const activities = data?.activities || [];

  // Update timestamps every 30 seconds to show relative time
  useEffect(() => {
    const interval = setInterval(() => {
      mutate(); // Trigger re-render for timestamp updates
    }, 30000);
    return () => clearInterval(interval);
  }, [mutate]);

  if (error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Activity Feed</h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Error
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-sm">Failed to load activity feed</p>
            <p className="text-xs text-gray-400">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Activity Feed</h3>
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
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-spin">⚙️</div>
              <p className="text-sm">Loading activity...</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm">No recent activity</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity: Activity, index: number) => (
              <div
                key={activity.id}
                className={`border-l-4 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${getSeverityBg(activity.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${getSeverityColor(activity.severity)}`}>
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                      {activity.service && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {activity.service}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 