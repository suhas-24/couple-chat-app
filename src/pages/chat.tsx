import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';
import CsvUpload from '@/components/chat/CsvUpload';
import { 
  Heart, 
  Send, 
  Upload, 
  Bot, 
  MessageSquare, 
  Plus,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  BarChart3
} from 'lucide-react';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user, logout } = useAuth();
  const { chats, currentChat, setCurrentChat, messages, sendMessage, loadChats } = useChat();
  const router = useRouter();

  // Update selected chat when currentChat changes
  useEffect(() => {
    if (currentChat) {
      setSelectedChatId(currentChat._id);
    }
  }, [currentChat]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;

    await sendMessage(message);
    setMessage('');
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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleCsvUpload = async (file: File) => {
    if (!currentChat) {
      alert('Please select a chat first');
      return;
    }
    
    try {
      // TODO: Implement actual CSV upload
      alert(`Uploading ${file.name} to ${currentChat.chatName}`);
      setShowCsvUpload(false);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV file');
    }
  };

  const filteredChats = chats.filter(chat => {
    const partner = chat.participants.find(p => p._id !== user?._id);
    return partner?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedChat = chats.find(c => c._id === selectedChatId);
  const currentMessages = messages || [];

  return (
    <div className="flex h-screen bg-dark-bg">
      {/* Sidebar */}
      <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-80 bg-sidebar-bg border-r border-border-color flex flex-col`}>
        {/* User Profile */}
        <div className="p-6 border-b border-border-color">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-text-primary font-semibold">{user?.name}</h3>
                <p className="text-text-secondary text-sm">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="md:hidden text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button className="p-2 bg-input-bg hover:bg-input-bg/80 text-text-secondary rounded-lg transition">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-input-bg hover:bg-input-bg/80 text-text-secondary rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-color">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-input-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                  onClick={() => {
                    setCurrentChat(chat);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full p-4 border-b border-border-color hover:bg-chatlist-bg/50 transition ${
                    selectedChatId === chat._id ? 'bg-chatlist-bg' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-text-primary font-medium">
                        {partner?.name || 'Unknown'}
                      </h4>
                      <p className="text-text-secondary text-sm truncate">
                        Start a conversation
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <p className="text-text-secondary">No chats yet</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 text-primary hover:text-primary/80 font-medium"
              >
                Start your first chat
              </button>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border-color space-y-2">
          <button 
            onClick={() => setShowCsvUpload(true)}
            className="w-full p-3 bg-input-bg hover:bg-input-bg/80 rounded-lg flex items-center space-x-3 transition"
          >
            <Upload className="w-5 h-5 text-text-secondary" />
            <span className="text-text-primary">Upload Chat History</span>
          </button>
          <button 
            onClick={() => router.push('/analytics')}
            className="w-full p-3 bg-input-bg hover:bg-input-bg/80 rounded-lg flex items-center space-x-3 transition"
          >
            <BarChart3 className="w-5 h-5 text-text-secondary" />
            <span className="text-text-primary">View Analytics</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-sidebar-bg border-b border-border-color p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden text-text-secondary hover:text-text-primary"
              >
                <Menu className="w-6 h-6" />
              </button>
              {selectedChat ? (
                <>
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-text-primary font-semibold">
                      {selectedChat.participants.find(p => p._id !== user?._id)?.name || 'Chat'}
                    </h2>
                    <p className="text-text-secondary text-sm">Active now</p>
                  </div>
                </>
              ) : (
                <h2 className="text-text-primary font-semibold">Select a chat to start messaging</h2>
              )}
            </div>
            
            {selectedChat && (
              <button className="p-2 bg-ai-chat-bubble-bg hover:bg-ai-chat-bubble-bg/80 rounded-lg transition">
                <Bot className="w-5 h-5 text-ai-text-primary" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedChat ? (
            <>
              {currentMessages.map((msg) => {
                const isSentByMe = msg.sender._id === user?._id;
                const isAI = false; // AI responses would be handled differently
                
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                        isAI 
                          ? 'bg-ai-chat-bubble-bg text-ai-text-primary'
                          : isSentByMe
                          ? 'bg-primary text-white'
                          : 'bg-chat-bubble-bg text-text-primary'
                      }`}
                    >
                      <p className="break-words">{msg.content.text}</p>
                      <p className={`text-xs mt-1 ${
                        isAI
                          ? 'text-ai-text-primary/70'
                          : isSentByMe 
                          ? 'text-white/70' 
                          : 'text-text-secondary'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" />
                <p className="text-text-secondary">Select a chat to view messages</p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedChat && (
          <div className="p-4 border-t border-border-color">
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-input-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-sidebar-bg rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Start New Chat</h3>
            <form onSubmit={handleCreateChat}>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="Enter partner's email"
                className="w-full px-4 py-3 bg-input-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
                required
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setPartnerEmail('');
                  }}
                  className="flex-1 px-4 py-2 bg-input-bg hover:bg-input-bg/80 text-text-primary rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-sidebar-bg rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Import Chat History</h3>
            <CsvUpload onUpload={handleCsvUpload} />
            <button
              onClick={() => setShowCsvUpload(false)}
              className="w-full mt-4 px-4 py-2 bg-input-bg hover:bg-input-bg/80 text-text-primary rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
