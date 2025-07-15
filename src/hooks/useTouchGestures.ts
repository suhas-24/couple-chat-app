import { useRef, useEffect, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface TouchGestureOptions {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPan?: (delta: { x: number; y: number }, point: TouchPoint) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  preventScroll?: boolean;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipe,
    onPinch,
    onTap,
    onDoubleTap,
    onLongPress,
    onPan,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventScroll = false,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);
  const isPinchingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);

  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
  }), []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  }), []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch
      const touchPoint = getTouchPoint(touches[0]);
      touchStartRef.current = touchPoint;
      isPanningRef.current = false;
      
      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current) {
            onLongPress(touchStartRef.current);
          }
        }, longPressDelay);
      }
    } else if (touches.length === 2) {
      // Two finger touch (pinch)
      isPinchingRef.current = true;
      initialDistanceRef.current = getDistance(touches[0], touches[1]);
      
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (preventScroll) {
      event.preventDefault();
    }
  }, [getTouchPoint, getDistance, onLongPress, longPressDelay, preventScroll]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touches = event.touches;
    
    if (touches.length === 1 && touchStartRef.current) {
      // Single touch move (pan)
      const currentPoint = getTouchPoint(touches[0]);
      const deltaX = currentPoint.x - touchStartRef.current.x;
      const deltaY = currentPoint.y - touchStartRef.current.y;
      
      // Check if we've moved enough to start panning
      if (!isPanningRef.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isPanningRef.current = true;
        
        // Clear long press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      
      if (isPanningRef.current && onPan) {
        onPan({ x: deltaX, y: deltaY }, currentPoint);
      }
    } else if (touches.length === 2 && isPinchingRef.current && onPinch) {
      // Two finger move (pinch)
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      const center = getCenter(touches[0], touches[1]);
      
      onPinch({ scale, center });
    }

    if (preventScroll) {
      event.preventDefault();
    }
  }, [getTouchPoint, getDistance, getCenter, onPan, onPinch, preventScroll]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const touches = event.changedTouches;
    
    if (touches.length === 1 && touchStartRef.current) {
      const touchPoint = getTouchPoint(touches[0]);
      touchEndRef.current = touchPoint;
      
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      // Check for swipe gesture
      if (!isPanningRef.current && onSwipe) {
        const deltaX = touchPoint.x - touchStartRef.current.x;
        const deltaY = touchPoint.y - touchStartRef.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = touchPoint.timestamp - touchStartRef.current.timestamp;
        const velocity = distance / duration;
        
        if (distance > swipeThreshold) {
          let direction: SwipeGesture['direction'];
          
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          
          onSwipe({ direction, distance, velocity, duration });
        }
      }
      
      // Check for tap gestures
      if (!isPanningRef.current && (onTap || onDoubleTap)) {
        const now = Date.now();
        
        if (lastTapRef.current && 
            now - lastTapRef.current.timestamp < doubleTapDelay &&
            Math.abs(touchPoint.x - lastTapRef.current.x) < 20 &&
            Math.abs(touchPoint.y - lastTapRef.current.y) < 20) {
          // Double tap
          if (onDoubleTap) {
            onDoubleTap(touchPoint);
          }
          lastTapRef.current = null;
        } else {
          // Single tap
          if (onTap) {
            // Delay single tap to check for double tap
            setTimeout(() => {
              if (lastTapRef.current && 
                  lastTapRef.current.timestamp === touchPoint.timestamp) {
                onTap(touchPoint);
              }
            }, doubleTapDelay);
          }
          lastTapRef.current = touchPoint;
        }
      }
    }
    
    // Reset states
    if (event.touches.length === 0) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      isPinchingRef.current = false;
      isPanningRef.current = false;
      initialDistanceRef.current = 0;
    }

    if (preventScroll) {
      event.preventDefault();
    }
  }, [getTouchPoint, onSwipe, onTap, onDoubleTap, swipeThreshold, doubleTapDelay, preventScroll]);

  const attachListeners = useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventScroll });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  return { attachListeners };
};

// Hook for swipe navigation
export const useSwipeNavigation = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 100
) => {
  const { attachListeners } = useTouchGestures({
    onSwipe: (gesture) => {
      if (gesture.distance > threshold) {
        if (gesture.direction === 'left' && onSwipeLeft) {
          onSwipeLeft();
        } else if (gesture.direction === 'right' && onSwipeRight) {
          onSwipeRight();
        }
      }
    },
    swipeThreshold: threshold,
  });

  return { attachListeners };
};

// Hook for pull-to-refresh
export const usePullToRefresh = (
  onRefresh: () => void | Promise<void>,
  threshold = 80
) => {
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const { attachListeners } = useTouchGestures({
    onPan: (delta, point) => {
      if (delta.y > 0 && window.scrollY === 0 && !isRefreshingRef.current) {
        pullDistanceRef.current = delta.y;
        
        // Visual feedback could be added here
        if (delta.y > threshold) {
          // Trigger refresh
          isRefreshingRef.current = true;
          const result = onRefresh();
          
          if (result instanceof Promise) {
            result.finally(() => {
              isRefreshingRef.current = false;
              pullDistanceRef.current = 0;
            });
          } else {
            isRefreshingRef.current = false;
            pullDistanceRef.current = 0;
          }
        }
      }
    },
    preventScroll: false,
  });

  return { 
    attachListeners,
    isRefreshing: isRefreshingRef.current,
    pullDistance: pullDistanceRef.current,
  };
};

// Hook for image zoom/pan
export const useImageZoom = () => {
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const { attachListeners } = useTouchGestures({
    onPinch: (gesture) => {
      scaleRef.current = Math.max(0.5, Math.min(3, gesture.scale));
    },
    onPan: (delta) => {
      if (scaleRef.current > 1) {
        offsetRef.current = {
          x: offsetRef.current.x + delta.x,
          y: offsetRef.current.y + delta.y,
        };
      }
    },
    onDoubleTap: () => {
      // Reset zoom on double tap
      scaleRef.current = 1;
      offsetRef.current = { x: 0, y: 0 };
    },
  });

  const getTransform = () => {
    return `scale(${scaleRef.current}) translate(${offsetRef.current.x}px, ${offsetRef.current.y}px)`;
  };

  return { 
    attachListeners, 
    getTransform,
    scale: scaleRef.current,
    offset: offsetRef.current,
  };
};

export default useTouchGestures;