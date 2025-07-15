import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock connection API
const mockConnection = {
  type: 'wifi',
  effectiveType: '4g',
  downlink: 10,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection,
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigator.onLine = true;
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
  });

  it('returns initial network status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toEqual({
      isOnline: true,
      isSlowConnection: false,
      connectionType: 'wifi',
      effectiveType: '4g',
    });
  });

  it('detects slow connection', () => {
    mockConnection.effectiveType = '2g';
    mockConnection.downlink = 0.5;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('updates status when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates status when coming online', () => {
    navigator.onLine = false;
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('dispatches custom events on network changes', () => {
    const onlineListener = jest.fn();
    const offlineListener = jest.fn();

    window.addEventListener('network-online', onlineListener);
    window.addEventListener('network-offline', offlineListener);

    renderHook(() => useNetworkStatus());

    act(() => {
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(offlineListener).toHaveBeenCalled();

    act(() => {
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(onlineListener).toHaveBeenCalled();

    window.removeEventListener('network-online', onlineListener);
    window.removeEventListener('network-offline', offlineListener);
  });

  it('handles missing connection API gracefully', () => {
    const originalConnection = (navigator as any).connection;
    delete (navigator as any).connection;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toEqual({
      isOnline: true,
      isSlowConnection: false,
      connectionType: 'unknown',
      effectiveType: 'unknown',
    });

    (navigator as any).connection = originalConnection;
  });
});