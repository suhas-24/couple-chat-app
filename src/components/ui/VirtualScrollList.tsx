import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

interface ScrollState {
  scrollTop: number;
  isScrolling: boolean;
}

export interface VirtualScrollListHandle {
  scrollToBottom: () => void;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
}

function VirtualScrollListInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  onEndReached,
  endReachedThreshold = 100,
  loading = false,
  loadingComponent,
  emptyComponent,
  keyExtractor = (_, index) => index,
}: VirtualScrollListProps<T>, ref: React.Ref<VirtualScrollListHandle>) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollTop: 0,
    isScrolling: false,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTop = useRef(0);
  const endReachedRef = useRef(false);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const { scrollTop } = scrollState;
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

    return { startIndex, endIndex, visibleStart, visibleEnd };
  }, [scrollState.scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: keyExtractor(item, startIndex + index),
    }));
  }, [items, visibleRange, keyExtractor]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    
    setScrollState(prev => ({
      ...prev,
      scrollTop,
      isScrolling: true,
    }));

    // Call onScroll callback
    onScroll?.(scrollTop);

    // Check if we've reached the end
    if (onEndReached && !endReachedRef.current) {
      const scrollHeight = event.currentTarget.scrollHeight;
      const clientHeight = event.currentTarget.clientHeight;
      const distanceFromEnd = scrollHeight - (scrollTop + clientHeight);
      
      if (distanceFromEnd <= endReachedThreshold) {
        endReachedRef.current = true;
        onEndReached();
      }
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to detect end of scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollState(prev => ({
        ...prev,
        isScrolling: false,
      }));
    }, 150);

    lastScrollTop.current = scrollTop;
  }, [onScroll, onEndReached, endReachedThreshold]);

  // Reset end reached flag when items change
  useEffect(() => {
    endReachedRef.current = false;
  }, [items.length]);

  // Scroll to bottom (useful for chat messages)
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (containerRef.current) {
      let scrollTop = index * itemHeight;
      
      if (align === 'center') {
        scrollTop -= containerHeight / 2 - itemHeight / 2;
      } else if (align === 'end') {
        scrollTop -= containerHeight - itemHeight;
      }
      
      containerRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, [itemHeight, containerHeight]);

  // Expose scroll methods
  useImperativeHandle(ref, () => ({
    scrollToBottom,
    scrollToIndex,
    scrollToTop: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    },
  }), [scrollToBottom, scrollToIndex]);

  // Render empty state
  if (items.length === 0 && !loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="text-center text-gray-500">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label="Virtual scroll list"
    >
      {/* Total height container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <div
              key={key}
              style={{ height: itemHeight }}
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={index + 1}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: itemHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const VirtualScrollList = forwardRef(VirtualScrollListInner) as <T>(
  props: VirtualScrollListProps<T> & { ref?: React.Ref<VirtualScrollListHandle> }
) => React.ReactElement;

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const { itemHeight, containerHeight, overscan = 5 } = options;

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

    return { startIndex, endIndex, visibleStart, visibleEnd };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    scrollTop,
    isScrolling,
    setScrollTop,
    setIsScrolling,
  };
}

// Performance optimized message list component
interface VirtualMessageListProps {
  messages: any[];
  containerHeight: number;
  renderMessage: (message: any, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  loading?: boolean;
  className?: string;
}

export const VirtualMessageList = forwardRef<VirtualScrollListHandle, VirtualMessageListProps>(function VirtualMessageList(
  {
    messages,
    containerHeight,
    renderMessage,
    onLoadMore,
    loading = false,
    className = '',
  },
  ref
) {
  const estimatedItemHeight = 80; // Estimated height for messages
  
  return (
    <VirtualScrollList
      ref={ref}
      items={messages}
      itemHeight={estimatedItemHeight}
      containerHeight={containerHeight}
      renderItem={renderMessage}
      className={className}
      onEndReached={onLoadMore}
      loading={loading}
      loadingComponent={
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
          <span className="ml-2 text-gray-500">Loading more messages...</span>
        </div>
      }
      emptyComponent={
        <div className="flex flex-col items-center justify-center text-gray-500">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Start your conversation!</p>
        </div>
      }
      keyExtractor={(message) => message._id || message.id}
    />
  );
});

export default VirtualScrollList;