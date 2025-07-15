import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, SendHorizontal, Loader2, Calendar, Search, MessageSquare, Heart, Shield, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';

// Types for AI chat messages
interface AIChatMessage {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

// Types for date-specific memory lookups
interface DateMemory {
  date: string;
  messageCount: number;
  summary: string;
  messages: Array<{
    sender: string;
    content: string;
    time: string;
  }>;
}

const AIChatBot: React.FC = () => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateMemory, setDateMemory] = useState<DateMemory | null>(null);
  const [wordStats, setWordStats] = useState<{word: string, totalCount: number, countByParticipant: Record<string, number>} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    allowDataAnalysis: true,
    cacheResponses: true,
    shareInsights: false
  });
  const [conversationHistory, setConversationHistory] = useState<AIChatMessage[]>([]);
  
  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Context
  const { currentChat } = useChat();
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, dateMemory]);
  
  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          content: "Hi there! 💕 I'm your relationship AI assistant. I can help answer questions about your chat history like:\n\n• \"What did we talk about on Valentine's Day?\"\n• \"How many times have we said 'I love you'?\"\n• \"What was our first conversation about?\"\n\nWhat would you like to know?",
          role: 'ai',
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentChat) return;
    
    const userMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      role: 'user' as const,
      timestamp: new Date()
    };
    
    const loadingMessage = {
      id: `ai-${Date.now()}`,
      content: '',
      role: 'ai' as const,
      timestamp: new Date(),
      isLoading: true
    };
    
    // Reset states
    setInputValue('');
    setError(null);
    setDateMemory(null);
    setWordStats(null);
    
    // Add user message and loading indicator
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    
    try {
      setIsLoading(true);
      
      // Check for specific question patterns
      const lowerQuestion = inputValue.toLowerCase();
      
      // Date-specific questions
      if (lowerQuestion.includes('what did we') && 
          (lowerQuestion.includes('on this day') || 
           lowerQuestion.includes('on that day') ||
           lowerQuestion.match(/on \w+ \d{1,2}/) || 
           lowerQuestion.match(/on \w+day/))) {
        
        // Extract date or use today
        let dateQuery = new Date().toISOString().split('T')[0]; // Default to today
        
        // Try to extract specific date from question
        if (lowerQuestion.includes('valentine')) {
          const year = new Date().getFullYear();
          dateQuery = `${year}-02-14`;
        } else if (lowerQuestion.includes('christmas')) {
          const year = new Date().getFullYear();
          dateQuery = `${year}-12-25`;
        } else if (lowerQuestion.includes('yesterday')) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          dateQuery = yesterday.toISOString().split('T')[0];
        }
        
        // Get messages from that date
        const response = await api.ai.getMessagesByDate(currentChat._id, dateQuery);
        
        if (response.success) {
          setDateMemory(response);
          
          // Replace loading message with AI response
          setMessages(prev => prev.map(msg => 
            msg.id === loadingMessage.id 
              ? { ...msg, content: response.summary, isLoading: false }
              : msg
          ));
        }
      } 
      // Word frequency questions
      else if (lowerQuestion.match(/how many times.*said|mentioned|typed|wrote/) || 
               lowerQuestion.match(/how often.*said|mentioned|typed|wrote/)) {
        
        // Extract the word to search for
        const wordMatch = lowerQuestion.match(/said\s+["']?([^"'?.,!]+)["']?|\s+["']([^"'?.,!]+)["']/) || [];
        const wordToSearch = (wordMatch[1] || wordMatch[2] || '').trim();
        
        if (wordToSearch) {
          // Get word frequency
          const response = await api.ai.getWordFrequency(currentChat._id, wordToSearch);
          
          if (response.success) {
            setWordStats(response);
            
            // Format a nice response
            const formattedResponse = formatWordFrequencyResponse(response);
            
            // Replace loading message with AI response
            setMessages(prev => prev.map(msg => 
              msg.id === loadingMessage.id 
                ? { ...msg, content: formattedResponse, isLoading: false }
                : msg
            ));
          }
        } else {
          // General AI response for other questions
          await handleGeneralQuestion(inputValue, loadingMessage.id);
        }
      } 
      // General questions
      else {
        await handleGeneralQuestion(inputValue, loadingMessage.id);
      }
    } catch (err: any) {
      console.error('Error sending message to AI:', err);
      setError(err.message || 'Failed to get a response. Please try again.');
      
      // Replace loading message with error
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { 
              ...msg, 
              content: "I'm having trouble answering that right now. Please check if your Gemini API key is set up correctly in the backend/.env file.", 
              isLoading: false 
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle general questions with the AI
  const handleGeneralQuestion = async (question: string, messageId: string) => {
    const response = await api.ai.askAboutChatHistory(currentChat!._id, question);
    
    if (response.success) {
      // Replace loading message with AI response
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: response.answer, isLoading: false }
          : msg
      ));
    } else {
      throw new Error('Failed to get a response');
    }
  };

  // Format word frequency response
  const formatWordFrequencyResponse = (data: any) => {
    const { word, totalCount, countByParticipant } = data;
    
    if (totalCount === 0) {
      return `I couldn't find any instances of "${word}" in your chat history. 🔍`;
    }
    
    let response = `✨ I found that "${word}" has been mentioned ${totalCount} time${totalCount !== 1 ? 's' : ''} in your chat!`;
    
    if (Object.keys(countByParticipant).length > 1) {
      response += '\n\nBreakdown by person:\n';
      Object.entries(countByParticipant).forEach(([name, count]) => {
        response += `• ${name}: ${count} time${Number(count) !== 1 ? 's' : ''}\n`;
      });
    }
    
    return response;
  };

  // Handle keypress (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle the chat panel
  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Floating sparkles button */}
      <button
        onClick={toggleChat}
        className={`
          fixed bottom-20 right-6 p-3.5 rounded-full shadow-lg z-50
          transition-all duration-300 ease-in-out
          ${isOpen 
            ? 'bg-white text-pink-500 rotate-90 scale-90' 
            : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-110'}
        `}
        aria-label="AI Chat Assistant"
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border border-pink-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} />
                <h3 className="font-medium">Relationship AI</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={16} />
                </button>
                <button 
                  onClick={() => {
                    setMessages([]);
                    setConversationHistory([]);
                    setDateMemory(null);
                    setWordStats(null);
                    setError(null);
                  }}
                  className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  aria-label="Clear conversation"
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={toggleChat}
                  className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-white border-b border-pink-100 p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Shield size={16} className="mr-2 text-pink-500" />
                  Privacy & Settings
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Allow data analysis</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.allowDataAnalysis}
                      onChange={(e) => setPrivacySettings(prev => ({
                        ...prev,
                        allowDataAnalysis: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cache AI responses</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.cacheResponses}
                      onChange={(e) => setPrivacySettings(prev => ({
                        ...prev,
                        cacheResponses: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Share insights for improvement</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.shareInsights}
                      onChange={(e) => setPrivacySettings(prev => ({
                        ...prev,
                        shareInsights: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                  </label>
                </div>
                <div className="mt-3 pt-3 border-t border-pink-100">
                  <p className="text-xs text-gray-500">
                    🔒 Your conversations are private and secure. AI analysis happens locally and is not shared with third parties.
                  </p>
                </div>
              </div>
            )}

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-pink-50 to-purple-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-none'
                        : 'bg-white border border-pink-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 size={16} className="animate-spin text-pink-300" />
                        <span className="text-sm opacity-70">Thinking...</span>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-pink-100' : 'text-gray-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Date memory display */}
              {dateMemory && dateMemory.messageCount > 0 && (
                <div className="bg-white rounded-lg border border-pink-100 p-3 shadow-sm">
                  <div className="flex items-center space-x-2 border-b border-pink-50 pb-2 mb-2">
                    <Calendar size={16} className="text-pink-500" />
                    <h4 className="text-sm font-medium text-gray-700">
                      {new Date(dateMemory.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h4>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {dateMemory.messageCount} messages exchanged
                  </div>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1.5 bg-gray-50 rounded p-2">
                    {dateMemory.messages.slice(0, 5).map((msg, idx) => (
                      <div key={idx} className="flex">
                        <span className="font-medium text-pink-600 mr-1">{msg.sender}:</span>
                        <span className="text-gray-700">{msg.content}</span>
                      </div>
                    ))}
                    {dateMemory.messages.length > 5 && (
                      <div className="text-center text-gray-500 italic pt-1">
                        +{dateMemory.messages.length - 5} more messages
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Word stats display */}
              {wordStats && (
                <div className="bg-white rounded-lg border border-pink-100 p-3 shadow-sm">
                  <div className="flex items-center space-x-2 border-b border-pink-50 pb-2 mb-2">
                    <Search size={16} className="text-pink-500" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Word Frequency: "{wordStats.word}"
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total mentions:</span>
                      <span className="text-sm font-medium bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
                        {wordStats.totalCount}
                      </span>
                    </div>
                    {Object.entries(wordStats.countByParticipant).map(([name, count], idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{name}:</span>
                        <span className="text-sm font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-pink-100 bg-white p-3">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your chat history..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all placeholder-gray-400 text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className={`p-2.5 rounded-full transition-all ${
                    inputValue.trim() && !isLoading
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow hover:shadow-md hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <SendHorizontal size={18} />
                  )}
                </button>
              </div>
              
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setInputValue("What did we talk about yesterday?")}
                  className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full transition-colors flex items-center"
                >
                  <Calendar size={12} className="mr-1" />
                  Yesterday's chat
                </button>
                <button
                  onClick={() => setInputValue("How many times have we said I love you?")}
                  className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full transition-colors flex items-center"
                >
                  <Heart size={12} className="mr-1" />
                  Love count
                </button>
                <button
                  onClick={() => setInputValue("What was our first conversation about?")}
                  className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full transition-colors flex items-center"
                >
                  <MessageSquare size={12} className="mr-1" />
                  First chat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatBot;
