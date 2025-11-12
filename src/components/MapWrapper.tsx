'use client';

import dynamic from 'next/dynamic';
import { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { useState } from 'react';

// Shared loading component with shimmer effect and fade animations
const LoadingScreen = ({ isVisible = true, message = "Loading Forest Shield..." }: { 
  isVisible?: boolean; 
  message?: string; 
}) => (
  <div className={`
    fixed inset-0 bg-gray-200 flex flex-col items-center justify-center text-gray-600 z-50
    transition-opacity duration-500 ease-out
    ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
  `}>
    {/* Shimmer background effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
    
    <div className="relative z-10">
      <img src="/logo.png" alt="Forest Shield" className="w-96 h-96 animate-pulse" />
      <div className="text-center mt-8">
        <div className="text-lg font-medium mb-2">{message}</div>
        <div className="text-sm">Please wait a moment while we prepare the map...</div>
        
        {/* Loading dots animation */}
        <div className="flex justify-center mt-4 space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

// Error boundary class component to catch Leaflet errors
class MapErrorBoundary extends Component<
  { children: ReactNode; mapKey: number; onError?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; mapKey: number; onError?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidUpdate(prevProps: { mapKey: number }) {
    // Reset error state when mapKey changes (parent is forcing a restart)
    if (prevProps.mapKey !== this.props.mapKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  static getDerivedStateFromError(error: Error) {
    // Handle both Leaflet errors we've seen
    if (error.message?.includes('Map container is being reused by another instance') ||
        error.message?.includes('Cannot read properties of undefined (reading \'appendChild\')') ||
        error.message?.includes('Cannot read properties of undefined (reading \'intersects\')')) {
      return { hasError: true, error };
    }
    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message?.includes('Map container is being reused by another instance') ||
        error.message?.includes('Cannot read properties of undefined (reading \'appendChild\')') ||
        error.message?.includes('Cannot read properties of undefined (reading \'intersects\')')) {
      console.warn('Leaflet error caught:', error.message);
      // Trigger recovery after a short delay
      setTimeout(() => {
        this.props.onError?.();
      }, 200);
    } else {
       // Re-throw other errors
       throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen relative">
          <LoadingScreen message="Reinitializing Map..." />
        </div>
      );
    }

    return this.props.children;
  }
}

// Dynamically import the MosaicLayout component to avoid SSR issues
const MosaicLayout = dynamic(() => import('./MosaicLayout'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen relative">
      <LoadingScreen />
    </div>
  )
});

export default function MapWrapper() {
  const [mapKey, setMapKey] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [mapKey]);

  const handleError = () => {
    console.log('Forcing complete map restart...');
    setMapKey(Date.now());
  };

  return (
    <div className="w-full h-screen relative">
      <MapErrorBoundary mapKey={mapKey} onError={handleError}>
        <MosaicLayout key={mapKey} />
      </MapErrorBoundary>
      <LoadingScreen isVisible={isLoading} />
    </div>
  );
} 