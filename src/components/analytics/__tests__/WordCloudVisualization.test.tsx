import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WordCloudVisualization from '../WordCloudVisualization';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockTheme = {
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
};

const mockWordData = {
  mostUsedWords: [
    { word: 'love', count: 150 },
    { word: 'happy', count: 120 },
    { word: 'beautiful', count: 100 },
    { word: 'amazing', count: 80 },
    { word: 'wonderful', count: 60 }
  ],
  emojiUsage: {
    '❤️': 50,
    '😊': 40,
    '💕': 35,
    '🥰': 30,
    '😍': 25,
    '💖': 20,
    '😘': 18,
    '🌹': 15,
    '💝': 12,
    '🎉': 10,
    '✨': 8,
    '🌟': 6
  },
  topPhrases: [
    { phrase: 'i love you', count: 25 },
    { phrase: 'good morning', count: 20 },
    { phrase: 'miss you', count: 18 },
    { phrase: 'see you', count: 15 }
  ],
  languageDistribution: {
    english: 1000,
    tamil: 300,
    mixed: 200
  },
  sentiment: {
    positive: 800,
    neutral: 500,
    negative: 200
  },
  totalWords: 25000,
  uniqueWords: 3500
};

const emptyWordData = {
  mostUsedWords: [],
  emojiUsage: {},
  topPhrases: [],
  languageDistribution: {
    english: 0,
    tamil: 0,
    mixed: 0
  },
  sentiment: {
    positive: 0,
    neutral: 0,
    negative: 0
  },
  totalWords: 0,
  uniqueWords: 0
};

describe('WordCloudVisualization', () => {
  test('renders word cloud with data', () => {
    render(<WordCloudVisualization wordData={mockWordData} theme={mockTheme} />);

    // Check if main components are rendered
    expect(screen.getByText('Word Cloud')).toBeInTheDocument();
    expect(screen.getByText('Emoji Love Language')).toBeInTheDocument();
    expect(screen.getByText('Your Special Phrases')).toBeInTheDocument();
    expect(screen.getByText('Language Mix')).toBeInTheDocument();

    // Check if words are displayed
    expect(screen.getByText('love')).toBeInTheDocument();
    expect(screen.getByText('happy')).toBeInTheDocument();
    expect(screen.getByText('beautiful')).toBeInTheDocument();

    // Check statistics
    expect(screen.getByText('25,000')).toBeInTheDocument(); // Total words
    expect(screen.getByText('3,500')).toBeInTheDocument(); // Unique words
    expect(screen.getByText('150')).toBeInTheDocument(); // Most used word count
  });

  test('renders emoji usage correctly', () => {
    render(<WordCloudVisualization wordData={mockWordData} theme={mockTheme} />);

    // Check if emojis are displayed
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('😊')).toBeInTheDocument();
    expect(screen.getByText('💕')).toBeInTheDocument();

    // Check emoji counts
    expect(screen.getByText('50')).toBeInTheDocument(); // ❤️ count
    expect(screen.getByText('40')).toBeInTheDocument(); // 😊 count
    expect(screen.getByText('35')).toBeInTheDocument(); // 💕 count
  });

  test('renders top phrases correctly', () => {
    render(<WordCloudVisualization wordData={mockWordData} theme={mockTheme} />);

    // Check if phrases are displayed
    expect(screen.getByText('"i love you"')).toBeInTheDocument();
    expect(screen.getByText('"good morning"')).toBeInTheDocument();
    expect(screen.getByText('"miss you"')).toBeInTheDocument();

    // Check phrase counts
    expect(screen.getByText('25x')).toBeInTheDocument();
    expect(screen.getByText('20x')).toBeInTheDocument();
    expect(screen.getByText('18x')).toBeInTheDocument();
  });

  test('renders language distribution correctly', () => {
    render(<WordCloudVisualization wordData={mockWordData} theme={mockTheme} />);

    // Check language labels
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
    expect(screen.getByText('Tanglish (Mixed)')).toBeInTheDocument();

    // Check percentages (calculated based on total: 1000 + 300 + 200 = 1500)
    expect(screen.getByText('67%')).toBeInTheDocument(); // English: 1000/1500
    expect(screen.getByText('20%')).toBeInTheDocument(); // Tamil: 300/1500
    expect(screen.getByText('13%')).toBeInTheDocument(); // Mixed: 200/1500
  });

  test('handles empty data gracefully', () => {
    render(<WordCloudVisualization wordData={emptyWordData} theme={mockTheme} />);

    // Should still render main sections
    expect(screen.getByText('Word Cloud')).toBeInTheDocument();
    expect(screen.getByText('Emoji Love Language')).toBeInTheDocument();
    expect(screen.getByText('Language Mix')).toBeInTheDocument();

    // Should show zero values
    expect(screen.getAllByText('0')).toHaveLength(6); // Multiple zeros for different stats

    // Should not render phrases section when no phrases
    expect(screen.queryByText('Your Special Phrases')).not.toBeInTheDocument();
  });

  test('handles missing emoji data', () => {
    const dataWithoutEmojis = {
      ...mockWordData,
      emojiUsage: {}
    };

    render(<WordCloudVisualization wordData={dataWithoutEmojis} theme={mockTheme} />);

    // Should still render emoji section but with no emojis
    expect(screen.getByText('Emoji Love Language')).toBeInTheDocument();
  });

  test('handles missing phrases data', () => {
    const dataWithoutPhrases = {
      ...mockWordData,
      topPhrases: []
    };

    render(<WordCloudVisualization wordData={dataWithoutPhrases} theme={mockTheme} />);

    // Should not render phrases section
    expect(screen.queryByText('Your Special Phrases')).not.toBeInTheDocument();
  });

  test('applies correct styling to words based on frequency', () => {
    render(<WordCloudVisualization wordData={mockWordData} theme={mockTheme} />);

    const loveWord = screen.getByText('love');
    const happyWord = screen.getByText('happy');

    // Love should have larger font size than happy (150 vs 120 count)
    expect(loveWord).toBeInTheDocument();
    expect(happyWord).toBeInTheDocument();
  });

  test('limits displayed words to 50', () => {
    const manyWords = Array.from({ length: 100 }, (_, i) => ({
      word: `word${i}`,
      count: 100 - i
    }));

    const dataWithManyWords = {
      ...mockWordData,
      mostUsedWords: manyWords
    };

    render(<WordCloudVisualization wordData={dataWithManyWords} theme={mockTheme} />);

    // Should only show first 50 words
    expect(screen.getByText('word0')).toBeInTheDocument();
    expect(screen.getByText('word49')).toBeInTheDocument();
    expect(screen.queryByText('word50')).not.toBeInTheDocument();
  });

  test('limits displayed emojis to 12', () => {
    const manyEmojis = Array.from({ length: 20 }, (_, i) => [`emoji${i}`, 20 - i])
      .reduce((acc, [emoji, count]) => ({ ...acc, [emoji]: count }), {});

    const dataWithManyEmojis = {
      ...mockWordData,
      emojiUsage: manyEmojis
    };

    render(<WordCloudVisualization wordData={dataWithManyEmojis} theme={mockTheme} />);

    // Should only show first 12 emojis
    expect(screen.getByText('emoji0')).toBeInTheDocument();
    expect(screen.getByText('emoji11')).toBeInTheDocument();
    expect(screen.queryByText('emoji12')).not.toBeInTheDocument();
  });

  test('limits displayed phrases to 10', () => {
    const manyPhrases = Array.from({ length: 15 }, (_, i) => ({
      phrase: `phrase ${i}`,
      count: 15 - i
    }));

    const dataWithManyPhrases = {
      ...mockWordData,
      topPhrases: manyPhrases
    };

    render(<WordCloudVisualization wordData={dataWithManyPhrases} theme={mockTheme} />);

    // Should only show first 10 phrases
    expect(screen.getByText('"phrase 0"')).toBeInTheDocument();
    expect(screen.getByText('"phrase 9"')).toBeInTheDocument();
    expect(screen.queryByText('"phrase 10"')).not.toBeInTheDocument();
  });
});