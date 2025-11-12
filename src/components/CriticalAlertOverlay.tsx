"use client";

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { api, Alert } from '../lib/api';
import { Button } from './ui/button';
import { 
  AlertTriangle, 
  ShieldAlert, 
  X, 
  MapPin, 
  Clock, 
  Zap, 
  Bell,
  Volume2,
  VolumeX,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

const fetcher = () => api.getAlerts(undefined, false);

interface CriticalAlertOverlayProps {
  onAlertAcknowledged?: (alertId: string) => void;
}

export default function CriticalAlertOverlay({ onAlertAcknowledged }: CriticalAlertOverlayProps) {
  const { data: alerts } = useSWR('alerts/unacknowledged', fetcher, {
    refreshInterval: 30000, // Check every 30 seconds
  });

  const [isDismissed, setIsDismissed] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  // Filter for critical and high alerts
  const criticalAlerts = alerts?.filter(alert => 
    alert.level === 'CRITICAL' || alert.level === 'HIGH'
  ) || [];

  // Filter out already acknowledged alerts
  const activeAlerts = criticalAlerts.filter(alert => !acknowledgedAlerts.has(alert.id));

  // Play notification sound for new critical alerts
  useEffect(() => {
    if (activeAlerts.length > 0 && soundEnabled && !isDismissed) {
      // Try to play MP3 file first, fallback to programmatic tone
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: Generate tone programmatically
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      });
    }
    
    // Reset dismissal when new alerts arrive
    if (activeAlerts.length > 0) {
      setIsDismissed(false);
    }
  }, [activeAlerts.length, soundEnabled, isDismissed]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
      onAlertAcknowledged?.(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowFullModal(false);
  };

  const handleShowFullModal = () => {
    setShowFullModal(true);
  };

  const handleCloseModal = () => {
    setShowFullModal(false);
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

  // Don't show anything if no critical alerts or if dismissed
  if (activeAlerts.length === 0 || isDismissed) {
    return null;
  }

  const mostCriticalAlert = activeAlerts.find(alert => alert.level === 'CRITICAL') || activeAlerts[0];

  // Show compact side notification by default
  if (!showFullModal) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-10 duration-500">
        <div 
          className={cn(
            "relative overflow-hidden rounded-lg border shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105",
            mostCriticalAlert.level === 'CRITICAL' 
              ? "bg-red-50 border-red-200 hover:bg-red-100" 
              : "bg-orange-50 border-orange-200 hover:bg-orange-100"
          )}
          onClick={handleShowFullModal}
        >
          {/* Accent Bar */}
          <div className={cn(
            "absolute left-0 top-0 h-full w-1",
            mostCriticalAlert.level === 'CRITICAL' ? "bg-red-600" : "bg-orange-600"
          )} />
          
          {/* Critical Alert Pulse Effect */}
          {mostCriticalAlert.level === 'CRITICAL' && (
            <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
          )}

          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  mostCriticalAlert.level === 'CRITICAL' ? "bg-red-600" : "bg-orange-600"
                )}>
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-bold text-sm",
                    mostCriticalAlert.level === 'CRITICAL' ? "text-red-800" : "text-orange-800"
                  )}>
                    {mostCriticalAlert.level} ALERT
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {activeAlerts.length > 1 && (
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold",
                    mostCriticalAlert.level === 'CRITICAL' 
                      ? "bg-red-600 text-white" 
                      : "bg-orange-600 text-white"
                  )}>
                    +{activeAlerts.length - 1}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alert Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {mostCriticalAlert.regionName}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-gray-500" />
                <span className={cn(
                  "text-lg font-bold",
                  mostCriticalAlert.level === 'CRITICAL' ? "text-red-700" : "text-orange-700"
                )}>
                  {parseFloat(mostCriticalAlert.deforestationPercentage.toString()).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-600">deforestation</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{getRelativeTime(mostCriticalAlert.timestamp)}</span>
              </div>
            </div>

            {/* Click to expand hint */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Click for details • Sound {soundEnabled ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show full modal when clicked
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
      
      {/* Full Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl mx-auto animate-in slide-in-from-top-10 duration-500">
          {/* Main Alert Card */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border-2 shadow-2xl",
            mostCriticalAlert.level === 'CRITICAL' 
              ? "bg-gradient-to-br from-red-900 via-red-800 to-red-900 border-red-600" 
              : "bg-gradient-to-br from-orange-900 via-orange-800 to-orange-900 border-orange-600"
          )}>
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            </div>

            {/* Pulsing Border Effect for Critical Alerts */}
            {mostCriticalAlert.level === 'CRITICAL' && (
              <div className="absolute inset-0 border-2 border-red-400 rounded-2xl animate-pulse"></div>
            )}

            {/* Header */}
            <div className="relative p-6 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex items-center justify-center w-16 h-16 rounded-full",
                    mostCriticalAlert.level === 'CRITICAL' ? "bg-red-600" : "bg-orange-600"
                  )}>
                    <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {mostCriticalAlert.level} ALERT
                    </h1>
                    <p className="text-white/80 text-lg">
                      Forest Shield Detection System
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title={soundEnabled ? "Disable sound" : "Enable sound"}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Alert Content */}
            <div className="relative p-6">
              <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm">
                {/* Primary Alert */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <MapPin className="w-5 h-5" />
                    <span className="text-xl font-bold">{mostCriticalAlert.regionName}</span>
                  </div>

                  <div className="flex items-center gap-3 text-white">
                    <Zap className="w-5 h-5" />
                    <div>
                      <span className="text-4xl font-bold">
                        {parseFloat(mostCriticalAlert.deforestationPercentage.toString()).toFixed(2)}%
                      </span>
                      <span className="text-white/80 ml-2">deforestation detected</span>
                    </div>
                  </div>

                  <p className="text-white/90 text-lg leading-relaxed">
                    {mostCriticalAlert.message}
                  </p>

                  <div className="flex items-center gap-2 text-white/70">
                    <Clock className="w-4 h-4" />
                    <span>{getRelativeTime(mostCriticalAlert.timestamp)}</span>
                    <span>•</span>
                    <span>{new Date(mostCriticalAlert.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Additional Alerts Summary */}
                {activeAlerts.length > 1 && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <p className="text-white/80 text-sm mb-3">
                      + {activeAlerts.length - 1} additional alert{activeAlerts.length - 1 !== 1 ? 's' : ''} requiring attention
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeAlerts.slice(1, 5).map((alert) => (
                        <div key={alert.id} className="bg-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium text-sm">{alert.regionName}</p>
                              <p className="text-white/70 text-xs">
                                {parseFloat(alert.deforestationPercentage.toString()).toFixed(1)}% • {alert.level}
                              </p>
                            </div>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              alert.level === 'CRITICAL' ? "bg-red-400" : "bg-orange-400"
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() => handleAcknowledge(mostCriticalAlert.id)}
                  className="flex-1 bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 text-lg"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Acknowledge Alert
                </Button>
                
                <Button
                  onClick={handleCloseModal}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-bold py-3"
                  size="lg"
                >
                  Close
                  <X className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Emergency Contact Info */}
              <div className="mt-6 p-4 bg-white/10 rounded-lg">
                <p className="text-white/80 text-sm text-center">
                  <Bell className="w-4 h-4 inline mr-2" />
                  For immediate assistance, contact the Forest Emergency Response Team
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Add to global CSS for shimmer animation
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-12deg); }
  100% { transform: translateX(200%) skewX(-12deg); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}
`; 