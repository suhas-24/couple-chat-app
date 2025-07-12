import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useChat } from '@/context/ChatContext';
import { Sparkles, Heart, Calendar, MessageCircle, X, Loader2, Send } from 'lucide-react';

type AISuggestionType = 'conversation' | 'date' | 'insight';

interface AISuggestion {
  id: string;
  type: AISuggestionType;
  content: string;
  icon: React.ReactNode;
}

const AIChatAssistant: React.FC = () => {
  const { currentChat, sendMessage } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<AISuggestionType>('conversation');

  // Load AI suggestions when the component opens
  useEffect(() => {
    if (isOpen && currentChat && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen, currentChat]);

  // Load AI-generated suggestions
  const loadSuggestions = async () => {
    if (!currentChat) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load different types of suggestions in parallel
      const [conversationRes, dateRes, insightRes] = await Promise.all([
        api.ai.getConversationStarters(currentChat._id).catch(() => ({ success: false })),
        api.ai.getDateIdeas(currentChat._id).catch(() => ({ success: false })),
        api.ai.getRelationshipInsights(currentChat._id).catch(() => ({ success: false }))
      ]);

      const newSuggestions: AISuggestion[] = [];
      
      // Process conversation starters
      if (conversationRes.success && 'conversationStarters' in conversationRes) {
        conversationRes.conversationStarters.forEach((starter: string, i: number) => {
          newSuggestions.push({
            id: `conv-${i}`,
            type: 'conversation',
            content: starter,
            icon: <MessageCircle className="h-4 w-4" />
          });
        });
      }
      
      // Process date ideas
      if (dateRes.success && 'dateIdeas' in dateRes) {
        dateRes.dateIdeas.forEach((idea: any, i: number) => {
          newSuggestions.push({
            id: `date-${i}`,
            type: 'date',
            content: `${idea.title}: ${idea.description}`,
            icon: <Calendar className="h-4 w-4" />
          });
        });
      }
      
      // Process relationship insights
      if (insightRes.success && 'insights' in insightRes) {
        // Add positive observations
        insightRes.insights.positiveObservations?.forEach((obs: string, i: number) => {
          newSuggestions.push({
            id: `insight-pos-${i}`,
            type: 'insight',
            content: obs,
            icon: <Heart className="h-4 w-4" />
          });
        });
        
        // Add suggestions
        insightRes.insights.suggestions?.forEach((sugg: string, i: number) => {
          newSuggestions.push({
            id: `insight-sugg-${i}`,
            type: 'insight',
            content: sugg,
            icon: <Heart className="h-4 w-4" />
          });
        });
      }
      
      if (newSuggestions.length === 0) {
        setError('No AI suggestions available. Please check your Gemini API key in backend/.env');
      } else {
        setSuggestions(newSuggestions);
      }
    } catch (err) {
      setError('Failed to load AI suggestions. Please try again later.');
      console.error('Error loading AI suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send a suggestion to the chat
  const sendSuggestion = (suggestion: AISuggestion) => {
    if (sendMessage) {
      sendMessage(suggestion.content);
      setIsOpen(false); // Close the assistant after sending
    }
  };

  // Filter suggestions by active tab
  const filteredSuggestions = suggestions.filter(s => s.type === activeTab);

  // Get title for the active tab
  const getTabTitle = (type: AISuggestionType) => {
    switch (type) {
      case 'conversation': return 'Conversation Starters';
      case 'date': return 'Date Ideas';
      case 'insight': return 'Relationship Insights';
      default: return '';
    }
  };

  return (
    <div className="relative z-10">
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-20 right-6 p-3 rounded-full shadow-lg
          ${isOpen 
            ? 'bg-white text-pink-500 rotate-90' 
            : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-110'}
          transition-all duration-300 ease-in-out
        `}
      >
        {isOpen ? <X /> : <Sparkles />}
      </button>

      {/* Assistant panel */}
      <div 
        className={`
          fixed bottom-32 right-6 w-80 bg-white rounded-2xl shadow-xl
          transition-all duration-300 ease-in-out overflow-hidden
          border border-pink-100
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-medium">Couple AI Assistant</h3>
          </div>
          <p className="text-xs opacity-80 mt-1">
            AI-powered suggestions for your relationship
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-pink-100">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'conversation' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}
          >
            <MessageCircle className="h-4 w-4 mx-auto mb-1" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('date')}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'date' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}
          >
            <Calendar className="h-4 w-4 mx-auto mb-1" />
            <span>Dates</span>
          </button>
          <button
            onClick={() => setActiveTab('insight')}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'insight' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}
          >
            <Heart className="h-4 w-4 mx-auto mb-1" />
            <span>Insights</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {getTabTitle(activeTab)}
          </h4>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-2" />
              <p className="text-sm text-gray-500">Loading AI suggestions...</p>
            </div>
          ) : error ? (
            <div className="bg-pink-50 rounded-lg p-4 text-sm text-pink-800">
              <p>{error}</p>
              <button 
                onClick={loadSuggestions}
                className="mt-2 text-xs font-medium text-pink-700 hover:text-pink-900"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id}
                    className="group relative bg-pink-50 rounded-lg p-3 hover:bg-pink-100 transition-colors"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0 text-pink-500 mr-2 mt-0.5">
                        {suggestion.icon}
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.content}</p>
                    </div>
                    <button
                      onClick={() => sendSuggestion(suggestion)}
                      className="absolute right-2 bottom-2 bg-pink-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Send to chat"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  No {activeTab} suggestions available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2 text-center">
          <p className="text-xs text-gray-500">
            Powered by Google Gemini 2.5 Flash
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatAssistant;
