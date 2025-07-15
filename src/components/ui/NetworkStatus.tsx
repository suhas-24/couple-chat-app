import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  className?: string;
}

export function NetworkStatus({ showWhenOnline = false, className = '' }: NetworkStatusProps) {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showStatus, setShowStatus] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowStatus(true);
      setJustCameOnline(false);
    } else if (showWhenOnline || justCameOnline) {
      setShowStatus(true);
      if (justCameOnline) {
        // Hide the "back online" message after 3 seconds
        const timer = setTimeout(() => {
          setShowStatus(false);
          setJustCameOnline(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowStatus(false);
    }
  }, [isOnline, showWhenOnline, justCameOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setJustCameOnline(true);
    };

    window.addEventListener('network-online', handleOnline);
    return () => window.removeEventListener('network-online', handleOnline);
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div
        className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300 ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-200' : 'bg-red-200'
            }`}
          />
          <span>
            {isOnline
              ? justCameOnline
                ? 'Back online!'
                : isSlowConnection
                ? 'Slow connection'
                : 'Connected'
              : 'No internet connection'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default NetworkStatus;