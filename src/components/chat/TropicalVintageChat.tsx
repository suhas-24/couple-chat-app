import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Upload, Bot, MessageSquare, Plus, Search, BarChart3, ArrowLeft, MoreVertical } from 'lucide-react';
import CsvUpload from './CsvUpload';
import { useViewport } from '@/components/ui/ResponsiveLayout';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TropicalVintageChat() {
  const [message, setMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [showMobileChatView, setShowMobileChatView] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { chats, currentChat, setCurrentChat, messages, sendMessage, loadChats } = useChat();
  const viewport = useViewport();

  // Update selected chat when currentChat changes
  useEffect(() => {
    if (currentChat) {
      setSelectedChatId(currentChat._id);
    }
  }, [currentChat]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;

    // Check if message is directed to AI
    const isAIMessage = message.toLowerCase().includes('@ai') || message.toLowerCase().startsWith('ai,') || message.toLowerCase().startsWith('hey ai');
    
    if (isAIMessage) {
      // Send user message first
      await sendMessage(message);
      setMessage('');
      
      // Process AI response
      await handleAIResponse(message);
    } else {
      // Regular message
      await sendMessage(message);
      setMessage('');
    }
  };

  const handleAIResponse = async (userMessage: string) => {
    if (!currentChat) return;

    setAiProcessing(true);
    
    try {
      // Clean the message for AI processing
      const cleanMessage = userMessage.replace(/@ai/gi, '').replace(/^ai,?\s*/i, '').trim();
      
      // Determine the type of AI response needed
      let aiPrompt = '';
      const lowerMessage = cleanMessage.toLowerCase();
      
      if (lowerMessage.includes('date idea') || lowerMessage.includes('date suggestion')) {
        aiPrompt = `As a romantic AI assistant for couples, suggest 2-3 creative and romantic date ideas based on: "${cleanMessage}". Make each suggestion specific with brief descriptions and why it's romantic.`;
      } else if (lowerMessage.includes('relationship advice') || lowerMessage.includes('relationship help')) {
        aiPrompt = `As a relationship counselor AI, provide thoughtful and practical advice for: "${cleanMessage}". Focus on communication, understanding, and strengthening the relationship bond.`;
      } else if (lowerMessage.includes('romantic') || lowerMessage.includes('romance')) {
        aiPrompt = `As a romantic AI assistant, help with this romantic request: "${cleanMessage}". Provide sweet, thoughtful suggestions to enhance romance and intimacy.`;
      } else if (lowerMessage.includes('communication') || lowerMessage.includes('talk') || lowerMessage.includes('conversation')) {
        aiPrompt = `As a communication expert AI, help improve couple communication for: "${cleanMessage}". Provide practical tips for better understanding and connection.`;
      } else if (lowerMessage.includes('fight') || lowerMessage.includes('argument') || lowerMessage.includes('conflict')) {
        aiPrompt = `As a relationship counselor AI, help resolve this relationship conflict: "${cleanMessage}". Provide gentle guidance for understanding each other and finding resolution.`;
      } else {
        aiPrompt = `As TropicTalk AI, a warm and supportive romantic relationship assistant, respond helpfully to: "${cleanMessage}". Provide caring, practical guidance for couples.`;
      }

      const response = await api.ai.askAboutChatHistory(currentChat._id, aiPrompt);
      
      if (response.success && response.answer) {
        // Send AI response as a message in the chat
        await sendAIMessage(response.answer);
      } else {
        await sendAIMessage("I'm having trouble processing your request right now. Please try asking in a different way! 💕");
      }
    } catch (error: any) {
      console.error('AI Response Error:', error);
      const errorMessage = error.message?.includes('network') 
        ? "I'm having trouble connecting right now. Please check your internet and try again! 🌐"
        : "Sorry, I'm experiencing some technical difficulties. Please try again later! 🌴";
      await sendAIMessage(errorMessage);
    } finally {
      setAiProcessing(false);
    }
  };

  const sendAIMessage = async (aiResponse: string) => {
    if (!currentChat) return;
    
    try {
      // Send AI message with special formatting
      const aiMessage = `🤖 **TropicTalk AI**: ${aiResponse}`;
      await sendMessage(aiMessage);
    } catch (error) {
      console.error('Error sending AI message:', error);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail.trim()) return;

    try {
      const response = await api.chat.createOrGetChat(partnerEmail);
      if (response.success) {
        await loadChats();
        setCurrentChat(response.chat);
        setShowNewChatModal(false);
        setPartnerEmail('');
      }
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      alert(error.message || 'Failed to create chat');
    }
  };

  const handleCsvUpload = async (file: File) => {
    if (!currentChat) {
      alert('Please select a chat first');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', currentChat._id);
      formData.append('format', 'generic');
      
      const response = await api.chat.uploadCsv(formData);
      
      if (response.success) {
        const stats = response.stats;
        alert(`Successfully uploaded ${file.name}!\n` +
              `Messages imported: ${stats.messagesImported}\n` +
              `Messages skipped: ${stats.messagesSkipped}\n` +
              `Success rate: ${stats.successRate}%`);
        
        await loadChats();
        if (currentChat) {
          setCurrentChat(currentChat);
        }
      } else {
        throw new Error('Upload failed');
      }
      
      setShowCsvUpload(false);
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      alert(error.message || 'Failed to upload CSV file');
    }
  };



  const filteredChats = chats.filter(chat => {
    const partner = chat.participants.find(p => p._id !== user?._id);
    return partner?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedChat = chats.find(c => c._id === selectedChatId);
  const currentMessages = messages || [];

  const handleChatSelect = (chat: any) => {
    setCurrentChat(chat);
    if (viewport.isMobile) {
      setShowMobileChatView(true);
    }
  };

  const handleBackToChatList = () => {
    setShowMobileChatView(false);
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F3F0E8' }}>
      {/* TropicTalk Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b-2 border-dashed border-[var(--brand-accent)] px-10 py-4 bg-paper">
        <div className="flex items-center gap-4 text-[var(--brand-primary)]">
          <MessageSquare className="h-8 w-8 text-[var(--brand-primary)]" />
          <h1 className="text-[var(--brand-primary)] text-2xl font-bold tracking-wider font-typewriter">
            TropicTalk
          </h1>
        </div>
        
        <nav className="flex items-center gap-8">
          <button 
            onClick={() => window.location.href = '/analytics'}
            className="text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-text-dark)] transition-colors duration-300 text-lg"
          >
            Dashboard
          </button>
          <span className="text-[var(--brand-text-dark)] font-bold border-b-2 border-[var(--brand-primary)] pb-1 text-lg">
            Chat
          </span>
          <button 
            onClick={() => setShowCsvUpload(true)}
            className="text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-text-dark)] transition-colors duration-300 text-lg"
          >
            Upload
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div 
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-[var(--brand-accent)]"
            style={{ backgroundImage: `url("${user?.avatar || 'https://via.placeholder.com/48'}")` }}
          />
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat List Sidebar */}
        <div className={`${
          viewport?.isMobile 
            ? (showMobileChatView ? 'hidden' : 'block w-full') 
            : 'block w-80'
        } bg-paper border-r-2 border-dashed border-[var(--brand-accent)] flex flex-col`}>
          
          {/* User Profile Section */}
          <div className="p-6 border-b-2 border-dashed border-[var(--brand-accent)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg font-typewriter">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-[var(--brand-text-dark)] font-semibold font-typewriter">{user?.name}</h3>
                  <p className="text-[var(--brand-primary)] text-sm">{user?.email}</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="stamp-button flex-1 text-sm"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                New Chat
              </button>
              <div className="text-xs text-[var(--brand-primary)] font-typewriter">
                💡 Tip: Use @AI for help!
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b-2 border-dashed border-[var(--brand-accent)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--brand-accent)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-10 pr-4 py-2 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const partner = chat.participants.find(p => p._id !== user?._id);
                return (
                  <button
                    key={chat._id}
                    onClick={() => handleChatSelect(chat)}
                    className={`w-full p-4 border-b border-dashed border-[var(--brand-accent)] hover:bg-white/30 transition ${
                      selectedChatId === chat._id ? 'bg-white/50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[var(--brand-accent)] rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-[var(--brand-primary)]" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-[var(--brand-text-dark)] font-medium font-typewriter">
                          {partner?.name || 'Unknown'}
                        </h4>
                        <p className="text-[var(--brand-primary)] text-sm truncate">
                          Start a conversation
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-16 h-16 text-[var(--brand-accent)] mx-auto mb-4 opacity-50" />
                <p className="text-[var(--brand-primary)] mb-4 font-typewriter">No chats yet</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="stamp-button"
                >
                  Start your first chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`${
          viewport?.isMobile 
            ? (showMobileChatView ? 'block w-full' : 'hidden') 
            : 'flex-1'
        } flex flex-col`}>
          
          {/* Chat Header */}
          <div className="bg-paper border-b-2 border-dashed border-[var(--brand-accent)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {viewport?.isMobile && (
                  <button
                    onClick={handleBackToChatList}
                    className="p-2 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-[var(--brand-primary)]" />
                  </button>
                )}
                {selectedChat ? (
                  <>
                    <div className="w-10 h-10 bg-[var(--brand-accent)] rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <h2 className="text-[var(--brand-text-dark)] font-semibold font-typewriter">
                        {selectedChat.participants.find(p => p._id !== user?._id)?.name || 'Chat'}
                      </h2>
                      <p className="text-[var(--brand-primary)] text-sm">Active now</p>
                    </div>
                  </>
                ) : (
                  <h2 className="text-[var(--brand-text-dark)] font-semibold font-typewriter">
                    Select a chat to start messaging
                  </h2>
                )}
              </div>
              
              {selectedChat && (
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-[var(--brand-primary)] font-typewriter flex items-center space-x-1">
                    <Bot className="w-3 h-3" />
                    <span>AI Assistant Active</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            {selectedChat ? (
              <div className="h-full flex flex-col">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper">
                  {currentMessages.map((msg) => {
                    const isSentByMe = msg.sender._id === user?._id;
                    const isAIMessage = msg.content.text.includes('🤖 **TropicTalk AI**:');
                    
                    return (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xs md:max-w-md px-4 py-3 rounded-2xl font-typewriter ${
                            isAIMessage
                              ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-[var(--brand-text-dark)] border-2 border-dashed border-purple-300'
                              : isSentByMe
                              ? 'bg-[var(--brand-primary)] text-[var(--brand-text-light)]'
                              : 'bg-white/70 text-[var(--brand-text-dark)] border-2 border-dashed border-[var(--brand-accent)]'
                          }`}
                        >
                          {isAIMessage ? (
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Bot className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-bold text-purple-600">TropicTalk AI</span>
                              </div>
                              <p className="break-words">
                                {msg.content.text.replace('🤖 **TropicTalk AI**: ', '')}
                              </p>
                            </div>
                          ) : (
                            <p className="break-words">{msg.content.text}</p>
                          )}
                          <p className={`text-xs mt-1 ${
                            isAIMessage
                              ? 'text-purple-500'
                              : isSentByMe 
                              ? 'text-[var(--brand-text-light)]/70' 
                              : 'text-[var(--brand-primary)]'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-paper">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-[var(--brand-accent)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--brand-primary)] font-typewriter">
                    Select a chat to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message Input with AI Integration */}
          {selectedChat && (
            <div className="p-4 border-t-2 border-dashed border-[var(--brand-accent)] bg-paper">
              {/* AI Suggestions */}
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setMessage('@AI give me a romantic date idea')}
                  className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                >
                  💡 Date Ideas
                </button>
                <button
                  onClick={() => setMessage('@AI give me relationship advice')}
                  className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                >
                  💕 Relationship Tips
                </button>
                <button
                  onClick={() => setMessage('@AI help with communication')}
                  className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                >
                  🗣️ Communication Help
                </button>
                <button
                  onClick={() => setMessage('@AI romantic suggestions')}
                  className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                >
                  🌹 Romance Ideas
                </button>
              </div>
              
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message or use @AI for assistance..."
                    className="w-full px-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
                  />
                  {message.toLowerCase().includes('@ai') && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Bot className="w-4 h-4 text-[var(--brand-primary)] animate-pulse" />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="stamp-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              
              <p className="text-xs text-[var(--brand-accent)] mt-2 font-typewriter text-center">
                💡 Use @AI for romantic advice, date ideas, relationship tips, and communication help
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-paper rounded-xl p-6 w-full max-w-md border-2 border-[var(--brand-accent)]">
            <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] mb-4 font-typewriter">Start New Chat</h3>
            <form onSubmit={handleCreateChat}>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="Enter partner's email"
                className="w-full px-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] mb-4 font-typewriter"
                required
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setPartnerEmail('');
                  }}
                  className="flex-1 px-4 py-2 bg-white/50 hover:bg-white/70 text-[var(--brand-text-dark)] rounded-lg transition border-2 border-dashed border-[var(--brand-accent)] font-typewriter"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="stamp-button flex-1 px-4 py-2"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCsvUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-paper rounded-xl p-6 w-full max-w-md border-2 border-[var(--brand-accent)]">
            <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] mb-4 font-typewriter">Upload Your Story</h3>
            <p className="text-[var(--brand-primary)] mb-4 font-typewriter">Let's decode your conversations. Upload your chat history to begin.</p>
            <CsvUpload onUpload={handleCsvUpload} />
            <button
              onClick={() => setShowCsvUpload(false)}
              className="w-full mt-4 px-4 py-2 bg-white/50 hover:bg-white/70 text-[var(--brand-text-dark)] rounded-lg transition border-2 border-dashed border-[var(--brand-accent)] font-typewriter"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


    </div>
  );
}