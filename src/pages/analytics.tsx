import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Heart, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  Sparkles,
  ArrowLeft,
  Bot
} from 'lucide-react';

interface AnalyticsData {
  totalMessages: number;
  totalChats: number;
  averageMessagesPerDay: number;
  mostActiveDay: string;
  relationshipScore: number;
  topWords: Array<{ word: string; count: number }>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    romantic: number;
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  
  const { user } = useAuth();
  const { chats } = useChat();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    loadAnalytics();
  }, [user, selectedTimeframe]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (chats.length === 0) {
        setAnalyticsData({
          totalMessages: 0,
          totalChats: 0,
          averageMessagesPerDay: 0,
          mostActiveDay: 'No data yet',
          relationshipScore: 0,
          topWords: [],
          sentimentAnalysis: { positive: 0, neutral: 0, romantic: 0 }
        });
        return;
      }

      // For now, we'll create mock data based on available chats
      // In a real implementation, this would call the analytics API
      const mockData: AnalyticsData = {
        totalMessages: chats.length * 25, // Estimate
        totalChats: chats.length,
        averageMessagesPerDay: 12,
        mostActiveDay: 'Saturday',
        relationshipScore: 85,
        topWords: [
          { word: 'love', count: 45 },
          { word: 'beautiful', count: 32 },
          { word: 'happy', count: 28 },
          { word: 'together', count: 24 },
          { word: 'amazing', count: 19 }
        ],
        sentimentAnalysis: {
          positive: 65,
          neutral: 25,
          romantic: 10
        }
      };
      
      setAnalyticsData(mockData);
    } catch (err: any) {
      console.error('Analytics loading error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F0E8' }}>
        <div className="bg-paper rounded-xl p-8 text-center border-2 border-[var(--brand-accent)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--brand-text-dark)] font-typewriter">Loading TropicTalk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F3F0E8' }}>
      {/* TropicTalk Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b-2 border-dashed border-[var(--brand-accent)] px-10 py-4 bg-paper">
        <div className="flex items-center gap-4 text-[var(--brand-primary)]">
          <BarChart3 className="h-8 w-8 text-[var(--brand-primary)]" />
          <h1 className="text-[var(--brand-primary)] text-2xl font-bold tracking-wider font-typewriter">
            TropicTalk
          </h1>
        </div>
        
        <nav className="flex items-center gap-8">
          <span className="text-[var(--brand-text-dark)] font-bold border-b-2 border-[var(--brand-primary)] pb-1 text-lg">
            Dashboard
          </span>
          <button 
            onClick={() => router.push('/chat')}
            className="text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-text-dark)] transition-colors duration-300 text-lg"
          >
            Chat
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="stamp-button p-2"
            title="Back to Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div 
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-[var(--brand-accent)]"
            style={{ backgroundImage: `url("${user?.avatar || 'https://via.placeholder.com/48'}")` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[var(--brand-text-dark)] tracking-tight font-typewriter">
              Your Love Story Dashboard
            </h2>
            <p className="mt-3 text-lg text-[var(--brand-primary)] font-typewriter">
              Beautiful insights into your relationship journey.
            </p>
          </div>

          {loading ? (
            <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)] text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-[var(--brand-text-dark)] font-typewriter">Loading your love analytics...</p>
            </div>
          ) : error ? (
            <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)] text-center">
              <p className="text-red-500 font-typewriter mb-4">{error}</p>
              <button
                onClick={loadAnalytics}
                className="stamp-button"
              >
                Try Again
              </button>
            </div>
          ) : analyticsData ? (
            <div className="space-y-8">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-paper shadow-lg rounded-xl p-6 border-2 border-[var(--brand-accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[var(--brand-primary)] text-sm font-typewriter">Total Messages</p>
                      <p className="text-2xl font-bold text-[var(--brand-text-dark)] font-typewriter">
                        {analyticsData.totalMessages.toLocaleString()}
                      </p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-[var(--brand-accent)]" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-paper shadow-lg rounded-xl p-6 border-2 border-[var(--brand-accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[var(--brand-primary)] text-sm font-typewriter">Active Chats</p>
                      <p className="text-2xl font-bold text-[var(--brand-text-dark)] font-typewriter">
                        {analyticsData.totalChats}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-[var(--brand-accent)]" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-paper shadow-lg rounded-xl p-6 border-2 border-[var(--brand-accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[var(--brand-primary)] text-sm font-typewriter">Daily Average</p>
                      <p className="text-2xl font-bold text-[var(--brand-text-dark)] font-typewriter">
                        {analyticsData.averageMessagesPerDay}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[var(--brand-accent)]" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-paper shadow-lg rounded-xl p-6 border-2 border-[var(--brand-accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[var(--brand-primary)] text-sm font-typewriter">Love Score</p>
                      <p className="text-2xl font-bold text-[var(--brand-text-dark)] font-typewriter">
                        {analyticsData.relationshipScore}%
                      </p>
                    </div>
                    <Heart className="w-8 h-8 text-[var(--brand-accent)]" />
                  </div>
                </motion.div>
              </div>

              {/* Top Words */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]"
              >
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] mb-6 font-typewriter flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Most Used Words</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {analyticsData.topWords.map((word, index) => (
                    <div key={word.word} className="text-center">
                      <div className="bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg p-4">
                        <p className="text-lg font-bold text-[var(--brand-text-dark)] font-typewriter">
                          {word.word}
                        </p>
                        <p className="text-sm text-[var(--brand-primary)] font-typewriter">
                          {word.count} times
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Sentiment Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]"
              >
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] mb-6 font-typewriter flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Conversation Mood</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">😊</span>
                    </div>
                    <p className="text-lg font-bold text-[var(--brand-text-dark)] font-typewriter">
                      {analyticsData.sentimentAnalysis.positive}%
                    </p>
                    <p className="text-sm text-[var(--brand-primary)] font-typewriter">Positive</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💕</span>
                    </div>
                    <p className="text-lg font-bold text-[var(--brand-text-dark)] font-typewriter">
                      {analyticsData.sentimentAnalysis.romantic}%
                    </p>
                    <p className="text-sm text-[var(--brand-primary)] font-typewriter">Romantic</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">😐</span>
                    </div>
                    <p className="text-lg font-bold text-[var(--brand-text-dark)] font-typewriter">
                      {analyticsData.sentimentAnalysis.neutral}%
                    </p>
                    <p className="text-sm text-[var(--brand-primary)] font-typewriter">Neutral</p>
                  </div>
                </div>
              </motion.div>

              {/* AI Insights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]"
              >
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] mb-6 font-typewriter flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <span>AI Relationship Insights</span>
                </h3>
                <div className="space-y-4">
                  <div className="bg-white/30 border-2 border-dashed border-[var(--brand-accent)] rounded-lg p-4">
                    <p className="text-[var(--brand-text-dark)] font-typewriter">
                      🌟 Your conversations show a beautiful balance of affection and daily communication. 
                      You both express love frequently and maintain strong emotional connection.
                    </p>
                  </div>
                  <div className="bg-white/30 border-2 border-dashed border-[var(--brand-accent)] rounded-lg p-4">
                    <p className="text-[var(--brand-text-dark)] font-typewriter">
                      💡 Suggestion: Try planning more weekend activities together - your chat patterns show 
                      you're most active and positive on Saturdays!
                    </p>
                  </div>
                  <div className="bg-white/30 border-2 border-dashed border-[var(--brand-accent)] rounded-lg p-4">
                    <p className="text-[var(--brand-text-dark)] font-typewriter">
                      🎯 Relationship Strength: Your frequent use of positive words like "love", "beautiful", 
                      and "amazing" indicates a very healthy and appreciative relationship dynamic.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}