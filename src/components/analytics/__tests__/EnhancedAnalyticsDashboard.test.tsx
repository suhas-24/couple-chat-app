import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedAnalyticsDashboard from '../EnhancedAnalyticsDashboard';
import { useChat } from '@/context/ChatContext';
import { api } from '@/services/api';

// Mock the dependencies
jest.mock('@/context/ChatContext');
jest.mock('@/services/api');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Radar: ({ data, options }: any) => (
    <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Scatter: ({ data, options }: any) => (
    <div data-testid="scatter-chart" data-chart-data={JSON.stringify(data)} />
  ),
}));

// Mock child components
jest.mock('../WordCloudVisualization', () => {
  return function MockWordCloudVisualization({ wordData, theme }: any) {
    return (
      <div data-testid="word-cloud-visualization">
        <div>Total Words: {wordData.totalWords}</div>
        <div>Unique Words: {wordData.uniqueWords}</div>
      </div>
    );
  };
});

jest.mock('../MilestonesTimeline', () => {
  return function MockMilestonesTimeline({ milestones, theme }: any) {
    return (
      <div data-testid="milestones-timeline">
        <div>Milestones Count: {milestones.length}</div>
      </div>
    );
  };
});

jest.mock('../RomanticChartThemes', () => ({
  getTheme: () => ({
    colors: {
      primary: '#ec4899',
      primaryLight: 'rgba(236, 72, 153, 0.1)',
      secondary: '#8b5cf6',
      accent: '#f97316',
      positive: '#10b981',
      neutral: '#6b7280',
      negative: '#ef4444',
      text: '#374151',
      textSecondary: '#6b7280',
      tooltipBg: 'rgba(255, 255, 255, 0.95)',
      tooltipText: '#374151',
      gridLines: 'rgba(0, 0, 0, 0.1)',
      gradient: ['#ec4899', '#8b5cf6', '#f97316']
    },
    fonts: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: 'Georgia, serif'
    }
  })
}));

const mockChatData = {
  _id: 'test-chat-id',
  chatName: 'Test Chat',
  participants: [
    { _id: 'user1', name: 'Alice' },
    { _id: 'user2', name: 'Bob' }
  ]
};

const mockAnalyticsData = {
  totalMessages: 1500,
  dateRange: {
    start: '2023-01-01',
    end: '2023-12-31'
  },
  basicStats: {
    averageMessagesPerDay: 15,
    responseTimeStats: {
      average: 5,
      median: 3,
      fastest: 1,
      slowest: 30
    }
  },
  activityPatterns: {
    activityTrends: [
      { date: '2023-01-01', messageCount: 10 },
      { date: '2023-01-02', messageCount: 15 },
      { date: '2023-01-03', messageCount: 8 }
    ],
    hourlyActivity: Array(24).fill(0).map((_, i) => i * 2),
    dailyActivity: {
      Monday: 100,
      Tuesday: 120,
      Wednesday: 90,
      Thursday: 110,
      Friday: 130,
      Saturday: 80,
      Sunday: 70
    },
    mostActiveHour: 14,
    mostActiveDay: 'Friday'
  },
  wordAnalysis: {
    totalWords: 25000,
    uniqueWords: 3500,
    mostUsedWords: [
      { word: 'love', count: 150 },
      { word: 'happy', count: 120 },
      { word: 'beautiful', count: 100 }
    ],
    sentiment: {
      positive: 800,
      neutral: 500,
      negative: 200
    },
    languageDistribution: {
      english: 1000,
      tamil: 300,
      mixed: 200
    },
    emojiUsage: {
      '❤️': 50,
      '😊': 40,
      '💕': 35
    }
  },
  milestones: [
    {
      type: 'anniversary',
      date: '2023-06-15',
      description: 'One year anniversary',
      significance: 'high' as const,
      messageCount: 45
    },
    {
      type: 'birthday',
      date: '2023-03-20',
      description: 'Birthday celebration',
      significance: 'medium' as const,
      messageCount: 30
    }
  ],
  chatInfo: {
    participants: mockChatData.participants
  }
};

describe('EnhancedAnalyticsDashboard', () => {
  const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    mockUseChat.mockReturnValue({
      currentChat: mockChatData,
      setCurrentChat: jest.fn(),
      messages: [],
      setMessages: jest.fn(),
      loading: false,
      sendMessage: jest.fn(),
      loadMessages: jest.fn()
    });

    mockApi.analytics.getChatStats.mockResolvedValue({
      success: true,
      data: mockAnalyticsData
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    mockApi.analytics.getChatStats.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<EnhancedAnalyticsDashboard />);
    
    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  test('renders analytics dashboard with data', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    // Check overview cards
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Total messages
    expect(screen.getByText('5m')).toBeInTheDocument(); // Response time
    expect(screen.getByText('3,500')).toBeInTheDocument(); // Unique words
    expect(screen.getByText('2')).toBeInTheDocument(); // Milestones
  });

  test('handles tab navigation', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    // Click on Activity tab
    fireEvent.click(screen.getByText('Activity'));
    
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    // Click on Words tab
    fireEvent.click(screen.getByText('Words'));
    
    await waitFor(() => {
      expect(screen.getByTestId('word-cloud-visualization')).toBeInTheDocument();
    });

    // Click on Milestones tab
    fireEvent.click(screen.getByText('Milestones'));
    
    await waitFor(() => {
      expect(screen.getByTestId('milestones-timeline')).toBeInTheDocument();
    });
  });

  test('handles refresh functionality', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockApi.analytics.getChatStats).toHaveBeenCalledTimes(2);
  });

  test('handles export functionality', async () => {
    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    const mockClick = jest.fn();
    
    Object.defineProperty(document, 'createElement', {
      value: jest.fn(() => ({
        href: '',
        download: '',
        click: mockClick
      }))
    });
    
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild
    });
    
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild
    });

    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  test('renders empty state when no data', async () => {
    mockApi.analytics.getChatStats.mockResolvedValue({
      success: true,
      data: null
    });

    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No Analytics Data')).toBeInTheDocument();
      expect(screen.getByText('Start chatting to see your relationship insights!')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    mockApi.analytics.getChatStats.mockRejectedValue(new Error('API Error'));

    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No Analytics Data')).toBeInTheDocument();
    });
  });

  test('renders chart data correctly', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    // Check if charts are rendered with correct data
    const lineChart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '{}');
    
    expect(chartData.datasets[0].data).toEqual([10, 15, 8]);
    expect(chartData.labels).toEqual(['Jan 1', 'Jan 2', 'Jan 3']);
  });

  test('displays insights correctly', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    // Click on Insights tab
    fireEvent.click(screen.getByText('Insights'));
    
    await waitFor(() => {
      expect(screen.getByText('53%')).toBeInTheDocument(); // Positive percentage
      expect(screen.getByText('14:00')).toBeInTheDocument(); // Most active hour
      expect(screen.getByText('Friday')).toBeInTheDocument(); // Most active day
    });
  });

  test('handles date range filtering', async () => {
    render(<EnhancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Relationship Analytics')).toBeInTheDocument();
    });

    // The component should call API with date range parameters when they change
    expect(mockApi.analytics.getChatStats).toHaveBeenCalledWith(
      'test-chat-id',
      expect.objectContaining({
        includeWordAnalysis: 'true',
        includeActivityPatterns: 'true',
        includeMilestones: 'true'
      })
    );
  });

  test('renders without current chat', () => {
    mockUseChat.mockReturnValue({
      currentChat: null,
      setCurrentChat: jest.fn(),
      messages: [],
      setMessages: jest.fn(),
      loading: false,
      sendMessage: jest.fn(),
      loadMessages: jest.fn()
    });

    render(<EnhancedAnalyticsDashboard />);

    // Should not crash and should not make API calls
    expect(mockApi.analytics.getChatStats).not.toHaveBeenCalled();
  });
});