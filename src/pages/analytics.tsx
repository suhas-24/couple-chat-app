import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ArrowLeft, MessageSquare, Calendar, TrendingUp, Heart, Clock, BarChart3, Sparkles } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { currentChat } = useChat();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-sidebar-bg border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/chat')}
                className="p-2 hover:bg-input-bg rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Relationship Analytics</h1>
                <p className="text-text-secondary text-sm">
                  {currentChat ? `Insights for ${currentChat.chatName}` : 'Overview of all your chats'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-ai-text-primary" />
              <span className="text-sm text-text-secondary">AI Powered Insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Messages */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-green-400">+12.5%</span>
            </div>
            <h3 className="text-text-secondary text-sm font-medium">Total Messages</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">12,584</p>
            <p className="text-xs text-text-secondary mt-2">1,543 this month</p>
          </div>
          
          {/* Love Score */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-primary">❤️ High</span>
            </div>
            <h3 className="text-text-secondary text-sm font-medium">Love Score</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">92%</p>
            <p className="text-xs text-text-secondary mt-2">Based on sentiment</p>
          </div>
          
          {/* Response Time */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-green-400">-2.3%</span>
            </div>
            <h3 className="text-text-secondary text-sm font-medium">Avg Response</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">2.4m</p>
            <p className="text-xs text-text-secondary mt-2">You: 2.1m | Partner: 2.7m</p>
          </div>

          {/* Conversation Streak */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-yellow-400">🔥 Active</span>
            </div>
            <h3 className="text-text-secondary text-sm font-medium">Current Streak</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">45 days</p>
            <p className="text-xs text-text-secondary mt-2">Best: 67 days</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-sidebar-bg border border-border-color rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Weekly Activity</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-text-secondary">You</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-ai-text-primary rounded-full"></div>
                <span className="text-text-secondary">Partner</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const yourHeight = Math.random() * 80 + 20;
              const partnerHeight = Math.random() * 80 + 20;
              return (
                <div key={day} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex space-x-1 items-end h-full">
                    <div 
                      className="flex-1 bg-primary/30 hover:bg-primary/40 rounded-t transition-all"
                      style={{ height: `${yourHeight}%` }}
                    />
                    <div 
                      className="flex-1 bg-ai-text-primary/30 hover:bg-ai-text-primary/40 rounded-t transition-all"
                      style={{ height: `${partnerHeight}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary mt-2">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Topics */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Top Conversation Topics</h3>
            <div className="space-y-3">
              {[
                { topic: 'Daily Life', count: 342, percentage: 28 },
                { topic: 'Future Plans', count: 256, percentage: 21 },
                { topic: 'Love & Affection', count: 198, percentage: 16 },
                { topic: 'Shared Memories', count: 156, percentage: 13 },
                { topic: 'Work & Career', count: 134, percentage: 11 },
              ].map((item) => (
                <div key={item.topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary">{item.topic}</span>
                    <span className="text-text-secondary">{item.count} mentions</span>
                  </div>
                  <div className="w-full bg-input-bg rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/60 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-sidebar-bg border border-border-color rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">AI Relationship Insights</h3>
              <BarChart3 className="w-5 h-5 text-ai-text-primary" />
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-ai-chat-bubble-bg/20 rounded-lg border border-ai-chat-bubble-bg/30">
                <p className="text-ai-text-primary text-sm font-medium mb-1">Communication Style</p>
                <p className="text-text-secondary text-sm">
                  You both maintain a healthy balance of initiating conversations. Your partner tends to use more emojis (avg 3.2 per message) showing emotional expressiveness.
                </p>
              </div>
              <div className="p-4 bg-ai-chat-bubble-bg/20 rounded-lg border border-ai-chat-bubble-bg/30">
                <p className="text-ai-text-primary text-sm font-medium mb-1">Emotional Connection</p>
                <p className="text-text-secondary text-sm">
                  High use of positive sentiment words (87%) and frequent expressions of affection indicate a strong emotional bond.
                </p>
              </div>
              <div className="p-4 bg-ai-chat-bubble-bg/20 rounded-lg border border-ai-chat-bubble-bg/30">
                <p className="text-ai-text-primary text-sm font-medium mb-1">Growth Opportunity</p>
                <p className="text-text-secondary text-sm">
                  Consider sharing more about your daily experiences. Partners who share daily details report 23% higher relationship satisfaction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Most Used Emojis */}
        <div className="bg-sidebar-bg border border-border-color rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Your Love Language in Emojis</h3>
          <div className="flex items-center justify-around">
            {[
              { emoji: '❤️', count: 1234 },
              { emoji: '😘', count: 892 },
              { emoji: '🥰', count: 756 },
              { emoji: '💕', count: 623 },
              { emoji: '😊', count: 589 },
              { emoji: '🤗', count: 445 },
              { emoji: '💖', count: 398 },
              { emoji: '😍', count: 342 },
            ].map((item) => (
              <div key={item.emoji} className="text-center">
                <div className="text-4xl mb-2">{item.emoji}</div>
                <p className="text-xs text-text-secondary">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
