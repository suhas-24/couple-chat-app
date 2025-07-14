import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useChat } from '@/context/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  MessageCircle, 
  Calendar, 
  TrendingUp, 
  Smile, 
  Award,
  Download,
  RefreshCw,
  Clock,
  Users,
  Sparkles,
  BarChart3
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import WordCloudVisualization from './WordCloudVisualization';
import MilestonesTimeline from './MilestonesTimeline';
import RomanticChartThemes from './RomanticChartThemes';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  basicStats: any;
  activityPatterns: any;
  wordAnalysis: any;
  milestones: any[];
  totalMessages: number;
  dateRange: any;
  chatInfo: any;
}

export default function EnhancedAnalyticsDashboard() {
  const { currentChat } = useChat();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    if (currentChat) {
      loadAnalytics();
    }
  }, [currentChat, dateRange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (realTimeUpdates && currentChat) {
      // Refresh analytics every 5 minutes for real-time updates
      interval = setInterval(() => {
        loadAnalytics(true);
      }, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeUpdates, currentChat]);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (!currentChat) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
        includeWordAnalysis: 'true',
        includeActivityPatterns: 'true',
        includeMilestones: 'true'
      };

      const response = await api.analytics.getChatStats(currentChat._id, params);
      
      if (response.success) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentChat, dateRange]);

  const exportAnalytics = async () => {
    if (!analyticsData || !currentChat) return;

    try {
      const exportData = {
        chatName: currentChat.chatName,
        exportDate: new Date().toISOString(),
        dateRange: analyticsData.dateRange,
        summary: {
          totalMessages: analyticsData.totalMessages,
          participants: analyticsData.chatInfo.participants.length,
          averageMessagesPerDay: analyticsData.basicStats.averageMessagesPerDay,
          relationshipHealth: analyticsData.basicStats.relationshipHealth || 'N/A'
        },
        statistics: analyticsData.basicStats,
        activityPatterns: analyticsData.activityPatterns,
        wordAnalysis: {
          totalWords: analyticsData.wordAnalysis.totalWords,
          uniqueWords: analyticsData.wordAnalysis.uniqueWords,
          topWords: analyticsData.wordAnalysis.mostUsedWords?.slice(0, 20),
          sentiment: analyticsData.wordAnalysis.sentiment,
          languageDistribution: analyticsData.wordAnalysis.languageDistribution
        },
        milestones: analyticsData.milestones
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentChat.chatName}-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-500"
        />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Heart className="h-16 w-16 text-pink-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No Analytics Data</h3>
            <p className="text-gray-500">Start chatting to see your relationship insights!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const romanticTheme = RomanticChartThemes.getTheme();

  // Prepare enhanced chart data with romantic themes
  const activityTrendData: ChartData<'line'> = {
    labels: analyticsData.activityPatterns.activityTrends?.map((d: any) => 
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [{
      label: 'Messages per Day',
      data: analyticsData.activityPatterns.activityTrends?.map((d: any) => d.messageCount) || [],
      borderColor: romanticTheme.colors.primary,
      backgroundColor: romanticTheme.colors.primaryLight,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: romanticTheme.colors.accent,
      pointBorderColor: romanticTheme.colors.primary,
      pointHoverBackgroundColor: romanticTheme.colors.secondary,
      pointHoverBorderColor: romanticTheme.colors.primary,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const hourlyActivityData: ChartData<'bar'> = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Messages by Hour',
      data: analyticsData.activityPatterns.hourlyActivity || Array(24).fill(0),
      backgroundColor: romanticTheme.colors.gradient,
      borderColor: romanticTheme.colors.primary,
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }]
  };

  const sentimentData: ChartData<'doughnut'> = {
    labels: ['Positive 💕', 'Neutral 😊', 'Negative 😔'],
    datasets: [{
      data: [
        analyticsData.wordAnalysis.sentiment?.positive || 0,
        analyticsData.wordAnalysis.sentiment?.neutral || 0,
        analyticsData.wordAnalysis.sentiment?.negative || 0
      ],
      backgroundColor: [
        romanticTheme.colors.positive,
        romanticTheme.colors.neutral,
        romanticTheme.colors.negative
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverBorderWidth: 3
    }]
  };

  const languageDistributionData: ChartData<'radar'> = {
    labels: ['English', 'Tamil', 'Mixed (Tanglish)'],
    datasets: [{
      label: 'Language Usage',
      data: [
        analyticsData.wordAnalysis.languageDistribution?.english || 0,
        analyticsData.wordAnalysis.languageDistribution?.tamil || 0,
        analyticsData.wordAnalysis.languageDistribution?.mixed || 0
      ],
      backgroundColor: romanticTheme.colors.primaryLight,
      borderColor: romanticTheme.colors.primary,
      pointBackgroundColor: romanticTheme.colors.accent,
      pointBorderColor: romanticTheme.colors.primary,
      pointHoverBackgroundColor: romanticTheme.colors.secondary,
      pointHoverBorderColor: romanticTheme.colors.primary
    }]
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: romanticTheme.colors.text,
          font: {
            family: romanticTheme.fonts.primary
          }
        }
      },
      tooltip: {
        backgroundColor: romanticTheme.colors.tooltipBg,
        titleColor: romanticTheme.colors.tooltipText,
        bodyColor: romanticTheme.colors.tooltipText,
        borderColor: romanticTheme.colors.primary,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: romanticTheme.colors.textSecondary
        },
        grid: {
          color: romanticTheme.colors.gridLines
        }
      },
      y: {
        ticks: {
          color: romanticTheme.colors.textSecondary
        },
        grid: {
          color: romanticTheme.colors.gridLines
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Relationship Analytics
          </h1>
          <p className="text-gray-600">Discover the beautiful patterns in your conversations</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="border-pink-200 hover:border-pink-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportAnalytics}
            className="border-pink-200 hover:border-pink-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-pink-100 hover:border-pink-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
              <MessageCircle className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsData.totalMessages.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                {analyticsData.basicStats.averageMessagesPerDay} per day average
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-purple-100 hover:border-purple-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsData.basicStats.responseTimeStats?.average || 0}m
              </div>
              <p className="text-xs text-gray-500">
                Average response time
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-blue-100 hover:border-blue-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unique Words</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsData.wordAnalysis.uniqueWords?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-500">
                In your conversations
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-green-100 hover:border-green-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Milestones</CardTitle>
              <Award className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsData.milestones?.length || 0}
              </div>
              <p className="text-xs text-gray-500">
                Special moments detected
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="words">Words</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="overview" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-pink-500" />
                    Activity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Line data={activityTrendData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="h-5 w-5 text-purple-500" />
                    Conversation Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut data={sentimentData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Hourly Activity Pattern</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar data={hourlyActivityData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Radar data={languageDistributionData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="words" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WordCloudVisualization 
                wordData={analyticsData.wordAnalysis} 
                theme={romanticTheme}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <MilestonesTimeline 
                milestones={analyticsData.milestones} 
                theme={romanticTheme}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Relationship Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-pink-50 rounded-lg">
                        <div className="text-2xl font-bold text-pink-600">
                          {Math.round((analyticsData.wordAnalysis.sentiment?.positive || 0) / 
                            (analyticsData.totalMessages || 1) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Positive Messages</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {analyticsData.activityPatterns.mostActiveHour || 0}:00
                        </div>
                        <div className="text-sm text-gray-600">Most Active Hour</div>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {analyticsData.activityPatterns.mostActiveDay || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Most Active Day</div>
                      </div>
                    </div>

                    <div className="prose max-w-none">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        Communication Patterns 💕
                      </h4>
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                        <p className="text-gray-700">
                          Your conversations show a beautiful balance of communication. 
                          You've shared {analyticsData.totalMessages.toLocaleString()} messages together, 
                          creating {analyticsData.milestones?.length || 0} special moments along the way.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}