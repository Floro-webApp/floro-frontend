'use client';

import { useState } from 'react';
import { useAWSServiceMonitoring } from '../hooks/useAWSServiceMonitoring';
import { Activity, AlertTriangle, CheckCircle, Clock, DollarSign, Server, Zap, RefreshCw } from 'lucide-react';

export default function AWSServicesPanel() {
  const {
    services,
    logs,
    executions,
    isLoading,
    error,
    refreshData,
    getTotalCost,
    getHealthyServicesCount,
    getErrorRate
  } = useAWSServiceMonitoring();

  // Default to 'executions' tab since it's still available (Step Functions API is enabled)
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'executions'>('executions');

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 border border-red-300">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">AWS Services Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (gb: number) => {
    if (gb < 1) return `${Math.round(gb * 1024)}MB`;
    return `${gb.toFixed(1)}GB`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#232f3e] text-white px-4 py-3 border-b border-[#3c4043]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-[#ff9900]" />
            <h2 className="font-semibold text-sm uppercase tracking-wide">AWS Services Monitor</h2>
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-[#0972d3] hover:bg-[#0558a5] transition-colors text-xs font-medium border border-[#0558a5] disabled:opacity-50"
            style={{ borderRadius: '2px' }}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 bg-[#f2f3f3] border-b border-[#d5dbdb]">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0f1419]">
              {services.length > 0 ? `${getHealthyServicesCount()}/${services.length}` : 'N/A'}
            </div>
            <div className="text-xs text-[#687078] uppercase tracking-wide">Healthy Services</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0f1419]">
              {services.length > 0 ? formatCurrency(getTotalCost()) : 'N/A'}
            </div>
            <div className="text-xs text-[#687078] uppercase tracking-wide">Monthly Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0f1419]">
              {services.length > 0 ? `${getErrorRate().toFixed(2)}%` : 'N/A'}
            </div>
            <div className="text-xs text-[#687078] uppercase tracking-wide">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0f1419]">{executions.filter(e => e.status === 'RUNNING').length}</div>
            <div className="text-xs text-[#687078] uppercase tracking-wide">Active Jobs</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#d5dbdb]">
        {[
          { id: 'overview', label: 'Service Overview', icon: Server, disabled: services.length === 0 },
          { id: 'logs', label: 'CloudWatch Logs', icon: Activity, disabled: logs.length === 0 },
          { id: 'executions', label: 'Step Functions', icon: Zap, disabled: false }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            disabled={tab.disabled}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[#0972d3] text-[#0972d3] bg-[#f0f8ff]'
                : 'border-transparent text-[#687078] hover:text-[#0f1419] hover:bg-[#f2f3f3]'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.disabled && <span className="text-xs text-gray-400">(Disabled)</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto p-4 pb-20">
            {services.length === 0 ? (
              <div className="text-center py-12">
                <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Service Overview Unavailable</h3>
                <p className="text-gray-600 text-sm">
                  AWS Service Metrics API is disabled for free tier usage.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map(service => (
                <div key={service.id} className="bg-white border border-[#d5dbdb] p-4" style={{ borderRadius: '2px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img src={`/aws-icons/${service.icon}.svg`} alt={service.name} className="w-8 h-8" />
                      <div>
                        <h3 className="font-semibold text-[#0f1419]">{service.name}</h3>
                        <p className="text-sm text-[#687078]">{service.region}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 border text-xs font-medium uppercase tracking-wide ${getStatusColor(service.status)}`} style={{ borderRadius: '2px' }}>
                      {getStatusIcon(service.status)}
                      {service.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {service.metrics.invocations !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Invocations</div>
                        <div className="font-semibold text-[#0f1419]">{service.metrics.invocations.toLocaleString()}</div>
                      </div>
                    )}
                    {service.metrics.errors !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Errors</div>
                        <div className="font-semibold text-red-600">{service.metrics.errors}</div>
                      </div>
                    )}
                    {service.metrics.duration !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Avg Duration</div>
                        <div className="font-semibold text-[#0f1419]">{formatDuration(service.metrics.duration)}</div>
                      </div>
                    )}
                    {service.metrics.storage !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Storage</div>
                        <div className="font-semibold text-[#0f1419]">{formatBytes(service.metrics.storage)}</div>
                      </div>
                    )}
                    {service.metrics.memory !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Memory</div>
                        <div className="font-semibold text-[#0f1419]">{service.metrics.memory}MB</div>
                      </div>
                    )}
                    {service.metrics.cost !== undefined && (
                      <div>
                        <div className="text-[#687078] uppercase tracking-wide text-xs mb-1">Monthly Cost</div>
                        <div className="font-semibold text-green-600">{formatCurrency(service.metrics.cost)}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[#eaeded] text-xs text-[#687078]">
                    Last updated: {service.lastUpdated.toLocaleTimeString()}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="h-full overflow-y-auto pb-20">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">CloudWatch Logs Unavailable</h3>
                <p className="text-gray-600 text-sm">
                  CloudWatch Logs API is disabled for free tier usage.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#eaeded]">
                {logs.map(log => (
                <div key={log.id} className="p-4 hover:bg-[#f2f3f3] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 text-xs font-bold uppercase tracking-wide border ${
                      log.level === 'ERROR' ? 'bg-red-100 text-red-800 border-red-300' :
                      log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      log.level === 'DEBUG' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                      'bg-blue-100 text-blue-800 border-blue-300'
                    }`} style={{ borderRadius: '2px' }}>
                      {log.level}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#0f1419] text-sm">{log.service}</span>
                        <span className="text-xs text-[#687078]">{log.timestamp.toLocaleTimeString()}</span>
                        {log.requestId && (
                          <span className="text-xs text-[#687078] font-mono bg-[#f2f3f3] px-1" style={{ borderRadius: '2px' }}>
                            {log.requestId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#0f1419] break-words">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'executions' && (
          <div className="h-full overflow-y-auto p-4 pb-20">
            <div className="grid gap-4">
              {executions.map(execution => (
                <div key={execution.id} className="bg-white border border-[#d5dbdb] p-4" style={{ borderRadius: '2px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0f1419] mb-1">{execution.name}</h3>
                      <p className="text-sm text-[#687078]">Started: {execution.startTime.toLocaleString()}</p>
                      {execution.endTime && (
                        <p className="text-sm text-[#687078]">Ended: {execution.endTime.toLocaleString()}</p>
                      )}
                    </div>
                    <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border ${
                      execution.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800 border-green-300' :
                      execution.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' :
                      execution.status === 'RUNNING' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      'bg-yellow-100 text-yellow-800 border-yellow-300'
                    }`} style={{ borderRadius: '2px' }}>
                      {execution.status}
                    </div>
                  </div>

                  {execution.duration && (
                    <div className="mb-3">
                      <span className="text-sm text-[#687078]">Duration: </span>
                      <span className="text-sm font-semibold text-[#0f1419]">{formatDuration(execution.duration)}</span>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-[#687078] uppercase tracking-wide mb-2">Input</h4>
                      <pre className="text-xs bg-[#f2f3f3] p-2 border border-[#d5dbdb] overflow-x-auto font-mono" style={{ borderRadius: '2px' }}>
                        {JSON.stringify(execution.input, null, 2)}
                      </pre>
                    </div>
                    {execution.output && (
                      <div>
                        <h4 className="text-xs font-semibold text-[#687078] uppercase tracking-wide mb-2">Output</h4>
                        <pre className="text-xs bg-[#f2f3f3] p-2 border border-[#d5dbdb] overflow-x-auto font-mono" style={{ borderRadius: '2px' }}>
                          {JSON.stringify(execution.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-[#0972d3]" />
            <span className="text-[#687078]">Loading AWS services...</span>
          </div>
        </div>
      )}
    </div>
  );
} 