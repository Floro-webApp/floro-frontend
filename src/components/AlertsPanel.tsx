"use client";

import useSWR, { useSWRConfig } from 'swr';
import { api, Alert } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, ShieldAlert, ShieldCheck, ShieldQuestion, Clock, MapPin, Zap, Bell, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { useState, useEffect } from 'react';

const alertConfig = {
  CRITICAL: { 
    icon: ShieldAlert, 
    color: 'text-red-600', 
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100', 
    borderColor: 'border-red-200',
    accentColor: 'bg-red-600',
    badgeColor: 'bg-red-600 text-white',
    glowColor: 'shadow-red-500/20'
  },
  HIGH: { 
    icon: ShieldAlert, 
    color: 'text-orange-600', 
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100', 
    borderColor: 'border-orange-200',
    accentColor: 'bg-orange-600',
    badgeColor: 'bg-orange-600 text-white',
    glowColor: 'shadow-orange-500/20'
  },
  MODERATE: { 
    icon: ShieldQuestion, 
    color: 'text-amber-600', 
    bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100', 
    borderColor: 'border-amber-200',
    accentColor: 'bg-amber-600',
    badgeColor: 'bg-amber-600 text-white',
    glowColor: 'shadow-amber-500/20'
  },
  LOW: { 
    icon: ShieldCheck, 
    color: 'text-blue-600', 
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100', 
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-600',
    badgeColor: 'bg-blue-600 text-white',
    glowColor: 'shadow-blue-500/20'
  },
};

const fetcher = () => api.getAlerts(undefined, false); // Fetch only unacknowledged alerts

function AlertCard({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (id: string) => void }) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const config = alertConfig[alert.level];
  const Icon = config.icon;

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-xl",
      config.bgColor,
      config.borderColor,
      config.glowColor,
      alert.level === 'CRITICAL' && "animate-pulse shadow-lg shadow-red-500/25",
      alert.level === 'HIGH' && "shadow-orange-500/20",
      "hover:scale-[1.02] hover:-translate-y-1 transform-gpu"
    )}>
      {/* Accent Bar with breathing effect for critical alerts */}
      <div className={cn(
        "absolute left-0 top-0 h-full w-1 transition-all duration-300",
        config.accentColor,
        alert.level === 'CRITICAL' && "animate-pulse w-2"
      )} />
      
      {/* Subtle background animation for critical alerts */}
      {alert.level === 'CRITICAL' && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/30 to-transparent -skew-x-12 animate-shimmer"></div>
        </div>
      )}
      
      {/* Alert Level Badge */}
      <div className={cn(
        "absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider",
        config.badgeColor
      )}>
        {alert.level}
      </div>

      <CardContent className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Icon with Animation */}
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110",
            alert.level === 'CRITICAL' ? 'bg-red-600' : 
            alert.level === 'HIGH' ? 'bg-orange-600' :
            alert.level === 'MODERATE' ? 'bg-amber-600' : 'bg-blue-600'
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 space-y-2">
            {/* Region Name with Icon */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <h3 className="font-bold text-gray-900 text-lg">
                {alert.regionName}
              </h3>
            </div>
            
            {/* Deforestation Percentage - Large and Prominent */}
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-500" />
              <span className="text-2xl font-bold text-gray-900">
                {parseFloat(alert.deforestationPercentage.toString()).toFixed(2)}%
              </span>
              <span className="text-sm text-gray-600">deforestation detected</span>
            </div>
            
            {/* Alert Message */}
            <p className="text-gray-700 font-medium leading-relaxed">
              {alert.message}
            </p>
            
            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{getRelativeTime(alert.timestamp)}</span>
              <span className="text-gray-400">•</span>
              <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "font-semibold transition-all duration-200 hover:shadow-md",
              alert.level === 'CRITICAL' && "border-red-600 text-red-600 hover:bg-red-600 hover:text-white",
              alert.level === 'HIGH' && "border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white",
              alert.level === 'MODERATE' && "border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white",
              alert.level === 'LOW' && "border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            )}
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
          >
            {isAcknowledging ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Acknowledging...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Acknowledge Alert
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </div>
  );
}

export default function AlertsPanel() {
  const { data: alerts, error, isLoading } = useSWR('alerts/unacknowledged', fetcher);
  const { mutate } = useSWRConfig();

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Optimistically update the UI
      mutate('alerts/unacknowledged', (currentData: Alert[] | undefined) => 
        currentData?.filter(a => a.id !== alertId) ?? [], 
        false
      );
      await api.acknowledgeAlert(alertId);
      // Trigger a revalidation to get the latest state from the server
      mutate('alerts/unacknowledged');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      // Revert optimistic update on failure
      mutate('alerts/unacknowledged');
    }
  };

  // Loading state with modern skeleton
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-pulse bg-gray-300 rounded-full h-8 w-8" />
          <div className="animate-pulse bg-gray-300 rounded h-6 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg p-6">
              <div className="flex gap-4">
                <div className="bg-gray-300 rounded-full h-12 w-12" />
                <div className="flex-1 space-y-3">
                  <div className="bg-gray-300 rounded h-5 w-24" />
                  <div className="bg-gray-300 rounded h-8 w-16" />
                  <div className="bg-gray-300 rounded h-4 w-full" />
                  <div className="bg-gray-300 rounded h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-red-100 rounded-full p-4 mb-4">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-red-800 mb-2">Alert System Unavailable</h3>
        <p className="text-red-600 mb-4">Unable to load forest monitoring alerts</p>
        <p className="text-sm text-red-500">{error.message}</p>
        <Button 
          variant="outline" 
          className="mt-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => mutate('alerts/unacknowledged')}
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  // Empty state - All clear
  if (!alerts || alerts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-green-100 rounded-full p-6 mb-6">
          <ShieldCheck className="w-16 h-16 text-green-600" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-green-800">Forest Shield Active</h3>
          <p className="text-green-600 font-medium">All monitoring regions are secure</p>
          <p className="text-sm text-green-500">No deforestation alerts detected</p>
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>System monitoring active</span>
        </div>
      </div>
    );
  }

  // Sort alerts by severity and time
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
    const severityDiff = severityOrder[b.level] - severityOrder[a.level];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.level === 'HIGH').length;

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-full">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Alerts</h2>
              <p className="text-sm text-gray-600">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} requiring attention
              </p>
            </div>
          </div>
          
          {/* Alert Summary with pulse animation */}
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg shadow-red-500/50">
                {criticalCount} CRITICAL
              </div>
            )}
            {highCount > 0 && (
              <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md shadow-orange-500/30">
                {highCount} HIGH
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="p-4 space-y-4 overflow-y-auto">
        {sortedAlerts.map((alert) => (
          <AlertCard 
            key={alert.id} 
            alert={alert} 
            onAcknowledge={handleAcknowledge} 
          />
        ))}
      </div>
    </div>
  );
} 