import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'partner';
  timestamp: Date;
  emoji?: string;
}

interface ChatWindowProps {
  messages: Message[];
  partnerName: string;
  avatars: {
    me: string;
    partner: string;
  };
  onSend: (message: string) => void;
  isTyping: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  partnerName,
  avatars,
  onSend,
  isTyping
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle sending messages
  const handleSend = () => {
    if (inputMessage.trim()) {
      onSend(inputMessage.trim());
      setInputMessage('');
      inputRef.current?.focus();
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = message.timestamp.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Format time for message
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 to-purple-50 relative overflow-hidden">
      {/* Decorative hearts background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 text-pink-200 opacity-20">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="absolute top-32 right-20 text-purple-200 opacity-15">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="absolute bottom-20 left-1/4 text-pink-200 opacity-10">
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Chat Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-pink-200 px-6 py-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src={avatars.partner} 
              alt={partnerName}
              className="w-10 h-10 rounded-full border-2 border-pink-300 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              {partnerName}
              <span className="ml-2 text-pink-500">💕</span>
            </h2>
            <p className="text-sm text-gray-500">Online now</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
          <div key={dateKey}>
            {/* Date Separator */}
            <div className="flex justify-center my-6">
              <div className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-pink-200">
                <span className="text-sm font-medium text-gray-600">{formatDate(dateKey)}</span>
              </div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end space-x-2 ${
                  message.sender === 'me' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Partner Avatar */}
                {message.sender === 'partner' && (
                  <img
                    src={avatars.partner}
                    alt={partnerName}
                    className="w-8 h-8 rounded-full border-2 border-purple-300 shadow-sm"
                  />
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                    message.sender === 'me'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-md'
                      : 'bg-white border border-purple-200 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <p className="text-sm leading-relaxed flex-1">{message.content}</p>
                    {message.emoji && (
                      <span className="text-lg flex-shrink-0">{message.emoji}</span>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.sender === 'me'
                        ? 'text-pink-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                {/* My Avatar */}
                {message.sender === 'me' && (
                  <img
                    src={avatars.me}
                    alt="Me"
                    className="w-8 h-8 rounded-full border-2 border-pink-300 shadow-sm"
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-end space-x-2 justify-start">
            <img
              src={avatars.partner}
              alt={partnerName}
              className="w-8 h-8 rounded-full border-2 border-purple-300 shadow-sm"
            />
            <div className="bg-white border border-purple-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-md">
              <div className="flex space-x-2 items-center">
                <div className="typing-animation">
                  <span className="dot bg-gray-400"></span>
                  <span className="dot bg-gray-400"></span>
                  <span className="dot bg-gray-400"></span>
                </div>
                <span className="text-sm text-gray-500 ml-2">{partnerName} is typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-pink-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          {/* Emoji Button */}
          <button className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
            <span className="text-xl">😊</span>
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${partnerName}... 💭`}
              className="w-full px-4 py-3 bg-gray-50 border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all placeholder-gray-500"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className={`p-3 rounded-full transition-all ${
              inputMessage.trim()
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Love Quote Footer */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400 italic">
            "Every love story is beautiful, but ours is my favorite" 💕
          </p>
        </div>
      </div>

      {/* CSS for typing animation */}
      <style jsx>{`
        .typing-animation {
          display: flex;
          align-items: center;
          space-x: 4px;
        }
        
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 4px;
          animation: typingAnimation 1.4s infinite;
        }
        
        .dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typingAnimation {
          0%, 60%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          30% {
            transform: scale(1.3);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;

// Created with Comet Assistant
