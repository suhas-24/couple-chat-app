import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';
import ChatWindow from '@/components/chat/ChatWindow';
import CsvUpload from '@/components/chat/CsvUpload';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  MessageCircle, 
  Upload, 
  BarChart3, 
  LogOut,
  Plus,
  Heart
} from 'lucide-react';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { chats, currentChat, setCurrentChat, loadChats, messages, sendMessage } = useChat();
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const handleCreateChat = async () => {
    try {
      // Create or get existing chat using partner email
      const response = await api.chat.createOrGetChat(partnerEmail);
      
      if (response.success) {
        // Reload chats to include the new one
        await loadChats();
        
        // Set the new chat as current
        setCurrentChat(response.chat);
        
        // Close the modal
        setShowCreateChat(false);
        setPartnerEmail('');
      }
    } catch (error: any) {
      console.error('Error creating chat:', error);
      alert(error.message || 'Failed to create chat. Please check the email and try again.');
    }
  };

  const handleViewAnalytics = () => {
    router.push('/analytics');
  };

  const handleCsvUpload = async (file: File) => {
    if (!currentChat) {
      alert('Please select a chat first');
      return;
    }
    
    try {
      // In a real implementation, you would upload the CSV file here
      alert(`Uploading ${file.name} to ${currentChat.chatName}`);
      setShowCsvUpload(false);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV file');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* User Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-red-400 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">Online 💚</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <Button
            onClick={() => setShowCreateChat(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Chat
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your Chats
            </h3>
          </div>
          <div className="space-y-1 px-2">
            {chats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => setCurrentChat(chat)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                  currentChat?._id === chat._id
                    ? 'bg-pink-50 border border-pink-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Heart className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {chat.chatName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {chat.participants
                        .filter(p => p._id !== user._id)
                        .map(p => p.name)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCsvUpload(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Chat History
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAnalytics}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="w-6 h-6 text-pink-500" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentChat.chatName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {currentChat.participants.length} participants
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/settings')}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1">
              <ChatWindow 
                messages={messages.map(msg => ({
                  id: msg._id,
                  content: msg.content.text,
                  sender: msg.sender._id === user._id ? 'me' : 'partner',
                  timestamp: new Date(msg.createdAt),
                  emoji: msg.metadata.reactions?.[0]?.emoji
                }))}
                partnerName={currentChat.participants.find(p => p._id !== user._id)?.name || 'Partner'}
                avatars={{
                  me: `https://ui-avatars.com/api/?name=${user.name}&background=ec4899&color=fff`,
                  partner: `https://ui-avatars.com/api/?name=${currentChat.participants.find(p => p._id !== user._id)?.name || 'Partner'}&background=8b5cf6&color=fff`
                }}
                onSend={async (message) => {
                  await sendMessage(message);
                }}
                isTyping={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No chat selected
              </h3>
              <p className="text-gray-500 mb-4">
                Choose a chat from the sidebar or start a new one
              </p>
              <Button
                onClick={() => setShowCreateChat(true)}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Chat History</h3>
            <CsvUpload onUpload={handleCsvUpload} />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowCsvUpload(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Create Chat Modal */}
      {showCreateChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Start New Chat</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your partner's email to connect
            </p>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
            <div className="flex space-x-3 mt-4">
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
                onClick={handleCreateChat}
                disabled={!partnerEmail}
              >
                Create Chat
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateChat(false);
                  setPartnerEmail('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
