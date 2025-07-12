import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { currentChat } = useChat();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else if (!currentChat) {
      router.push('/chat');
    }
  }, [user, currentChat, router]);

  if (!user || !currentChat) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/chat')}
                className="mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Chat
              </Button>
              <div className="flex items-center space-x-3">
                <Heart className="w-6 h-6 text-pink-500" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Analytics for {currentChat.chatName}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Discover insights about your relationship
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
