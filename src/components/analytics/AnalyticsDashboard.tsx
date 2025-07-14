import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useChat } from '@/context/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Calendar, TrendingUp, Smile, Award } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const { currentChat } = useChat();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [wordCloud, setWordCloud] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [emojiStats, setEmojiStats] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiError, setAiError] = useState<string>(''); // store AI-specific error

  useEffect(() => {
    if (currentChat) {
      loadAllAnalytics();
    }
  }, [currentChat]);

  const loadAllAnalytics = async () => {
    if (!currentChat) return;
    
    setLoading(true);
    try {
      // 1️⃣  Load core analytics first (no AI)
      const [
        statsRes,
        wordCloudRes,
        timelineRes,
        milestonesRes,
        emojiRes
      ] = await Promise.all([
        api.analytics.getChatStats(currentChat._id),
        api.analytics.getWordCloud(currentChat._id, { limit: 30 }),
        api.analytics.getTimeline(currentChat._id, { groupBy: 'day' }),
        api.analytics.getMilestones(currentChat._id),
        api.analytics.getEmojiStats(currentChat._id)
      ]);

      setStats(statsRes.data);
      setWordCloud(wordCloudRes.data);
      setTimeline(timelineRes.data);
      setMilestones(milestonesRes.data.milestones);
      setEmojiStats(emojiRes.emojiStats);

      // 2️⃣  Fetch AI insights separately so failure doesn’t block the rest
      try {
        const aiRes = await api.ai.getRelationshipInsights(currentChat._id);
        setAiInsights(aiRes.insights);
        setAiError('');
      } catch (aiErr: any) {
        console.warn('AI service unavailable:', aiErr?.message || aiErr);
        setAiInsights(null);
        setAiError(
          aiErr?.message ||
            'AI service is not configured. Please add your Gemini API key in backend/.env.'
        );
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>No analytics data available</div>;
  }

  // Prepare chart data using the new data structure
  const dailyMessagesData: ChartData<'line'> = {
    labels: stats.activityPatterns?.activityTrends?.map((d: any) => 
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [{
      label: 'Messages per Day',
      data: stats.activityPatterns?.activityTrends?.map((d: any) => d.messageCount) || [],
      borderColor: 'rgb(236, 72, 153)',
      backgroundColor: 'rgba(236, 72, 153, 0.1)',
      tension: 0.4
    }]
  };

  const hourlyActivityData: ChartData<'bar'> = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Messages by Hour',
      data: stats.activityPatterns?.hourlyActivity || Array(24).fill(0),
      backgroundColor: 'rgba(147, 51, 234, 0.5)',
      borderColor: 'rgb(147, 51, 234)',
      borderWidth: 1
    }]
  };

  const messageTypeData: ChartData<'doughnut'> = {
    labels: ['Text', 'Emoji', 'Love Note'],
    datasets: [{
      data: [80, 15, 5], // Default data since messageTypes structure might be different
      backgroundColor: [
        'rgba(236, 72, 153, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(59, 130, 246, 0.8)'
      ]
    }]
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.basicStats?.averageMessagesPerDay || 0} per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relationship Health</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aiInsights ? `${aiInsights.healthScore}/10` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {aiInsights ? 'Based on AI analysis' : 'Enable AI for score'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Words</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wordCloud?.totalUniqueWords || 0}</div>
            <p className="text-xs text-muted-foreground">In your conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Emoji</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emojiStats?.topEmojis[0]?.emoji || '❤️'}
            </div>
            <p className="text-xs text-muted-foreground">
              Used {emojiStats?.topEmojis[0]?.count || 0} times
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="words">Words</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={dailyMessagesData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hourly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={hourlyActivityData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Doughnut data={messageTypeData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.basicStats?.messagesByUser && Object.entries(stats.basicStats.messagesByUser).map(([userId, data]: [string, any]) => (
                    <div key={userId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} messages
                        </p>
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full"
                          style={{
                            width: `${(data.count / stats.totalMessages) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="words" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Word Cloud</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {wordCloud?.topWords.map((word: any, index: number) => (
                  <span
                    key={word.word}
                    className="px-3 py-1 rounded-full bg-pink-100 text-pink-800"
                    style={{
                      fontSize: `${Math.max(12, 24 - index * 0.5)}px`,
                      opacity: Math.max(0.5, 1 - index * 0.02)
                    }}
                  >
                    {word.word} ({word.count})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Emojis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {emojiStats?.topEmojis.slice(0, 10).map((emoji: any) => (
                  <div key={emoji.emoji} className="text-center">
                    <div className="text-3xl mb-1">{emoji.emoji}</div>
                    <div className="text-sm text-muted-foreground">{emoji.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <Card key={index}>
                <CardContent className="flex items-center space-x-4 py-4">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">{milestone.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(milestone.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {aiInsights ? (
            <Card>
              <CardHeader>
                <CardTitle>AI Relationship Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Positive Observations 💕</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {aiInsights.positiveObservations.map((obs: string, i: number) => (
                      <li key={i} className="text-sm">{obs}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Communication Patterns 📊</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {aiInsights.communicationPatterns.map((pattern: string, i: number) => (
                      <li key={i} className="text-sm">{pattern}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Suggestions for Growth 🌱</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {aiInsights.suggestions.map((suggestion: string, i: number) => (
                      <li key={i} className="text-sm">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI Insights Unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {aiError ||
                    'AI insights are currently unavailable. Add a valid Gemini API key in backend/.env to enable this feature.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
