'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { api } from '../lib/api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service?: string;
  message: string;
  logGroup?: string;
  logStream?: string;
}

// Disabled for free tier - CloudWatch Logs API is commented out
// const fetcher = (params: { logGroup?: string; limit?: number }) => 
//   api.getCloudWatchLogs(params.logGroup, params.limit);
const fetcher = async (params: { logGroup?: string; limit?: number }) => {
  // Return empty data structure when API is disabled
  return { logs: [] };
};

export default function LogsPanel() {
  const [isLive, setIsLive] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    { logGroup: undefined, limit: 100 },
    fetcher,
    {
      refreshInterval: isLive ? 5000 : 0, // Refresh every 5 seconds when live
      revalidateOnFocus: false
    }
  );

  const logs: LogEntry[] = data?.logs || [];

  // Get unique services for filter
  const services = Array.from(new Set(logs.map(log => log.service).filter(Boolean)));

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (serviceFilter !== 'ALL' && log.service !== serviceFilter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.service?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Auto scroll to bottom
  useEffect(() => {
    if (isAutoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [filteredLogs, isAutoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'DEBUG': return 'text-gray-500 bg-gray-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'FATAL': return 'text-red-800 bg-red-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'DEBUG': return '🔍';
      case 'INFO': return 'ℹ️';
      case 'WARN': return '⚠️';
      case 'ERROR': return '❌';
      case 'FATAL': return '💀';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-2 border-b bg-[#f8f9fa]">
          <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">System Logs</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-600">
          <div className="text-center">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-sm">Failed to load logs</p>
            <p className="text-xs text-gray-400">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Header */}
      <div className="p-2 border-b bg-[#f8f9fa]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">System Logs</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isAutoScroll
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Auto
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${isLive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isLive ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content with Filters and Logs */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {/* Filters - Now part of scrollable content */}
        <div className="p-3 border-b bg-gray-50 space-y-2 sticky top-0 z-10">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
          <div className="flex items-center gap-2">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warning</option>
              <option value="ERROR">Error</option>
              <option value="FATAL">Fatal</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Services</option>
              {services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs list */}
        <div className="font-mono text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <div className="text-lg mb-1 animate-spin">⚙️</div>
                <p className="text-xs">Loading logs...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                {logs.length === 0 && !isLoading ? (
                  <>
                    <div className="text-lg mb-1">📝</div>
                    <p className="text-xs font-medium mb-1">CloudWatch Logs Unavailable</p>
                    <p className="text-xs text-gray-400">CloudWatch Logs API is disabled for free tier usage.</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg mb-1">📝</div>
                    <p className="text-xs">No logs match your filters</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`border-b border-gray-100 p-2 hover:bg-gray-50 transition-colors ${
                    index === 0 ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 text-xs font-mono flex-shrink-0 w-14">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    {log.service && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                        {log.service}
                      </span>
                    )}
                    <span className="text-gray-700 flex-1 leading-relaxed break-words">
                      {log.message}
                    </span>
                  </div>
                  {log.logGroup && (
                    <div className="mt-1 text-xs text-gray-400 pl-16">
                      {log.logGroup}{log.logStream && ` / ${log.logStream}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={logsEndRef} />
      </div>
    </div>
  );
} 