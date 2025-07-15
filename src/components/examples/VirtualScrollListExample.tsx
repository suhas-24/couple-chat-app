import React, { useRef } from 'react';
import VirtualScrollList, { VirtualScrollListHandle, VirtualMessageList } from '@/components/ui/VirtualScrollList';

// Example 1: Using VirtualScrollList directly
export function DirectExample() {
  const scrollRef = useRef<VirtualScrollListHandle>(null);
  
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }));

  const handleScrollToBottom = () => {
    scrollRef.current?.scrollToBottom();
  };

  const handleScrollToTop = () => {
    scrollRef.current?.scrollToTop();
  };

  const handleScrollToMiddle = () => {
    scrollRef.current?.scrollToIndex(50, 'center');
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={handleScrollToTop} className="px-4 py-2 bg-blue-500 text-white rounded">
          Scroll to Top
        </button>
        <button onClick={handleScrollToMiddle} className="px-4 py-2 bg-green-500 text-white rounded">
          Scroll to Middle
        </button>
        <button onClick={handleScrollToBottom} className="px-4 py-2 bg-purple-500 text-white rounded">
          Scroll to Bottom
        </button>
      </div>
      
      <VirtualScrollList
        ref={scrollRef}
        items={items}
        itemHeight={50}
        containerHeight={400}
        renderItem={(item) => (
          <div className="p-2 border-b">
            {item.text}
          </div>
        )}
        className="border rounded"
      />
    </div>
  );
}

// Example 2: Using VirtualMessageList
export function MessageListExample() {
  const messageListRef = useRef<VirtualScrollListHandle>(null);
  
  const messages = [
    { _id: '1', text: 'Hello!', sender: 'user' },
    { _id: '2', text: 'Hi there!', sender: 'other' },
    { _id: '3', text: 'How are you?', sender: 'user' },
    // ... more messages
  ];

  // Auto-scroll to bottom when new message arrives
  const sendMessage = () => {
    // After adding message to state...
    setTimeout(() => {
      messageListRef.current?.scrollToBottom();
    }, 100);
  };

  return (
    <div className="h-screen flex flex-col">
      <VirtualMessageList
        ref={messageListRef}
        messages={messages}
        containerHeight={600}
        renderMessage={(message) => (
          <div className={`p-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded ${
              message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              {message.text}
            </span>
          </div>
        )}
      />
      
      <button onClick={sendMessage} className="p-4 bg-blue-500 text-white">
        Send Message (and scroll to bottom)
      </button>
    </div>
  );
}
