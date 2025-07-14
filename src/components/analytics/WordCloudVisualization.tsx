import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Hash, Heart, Smile, Globe } from 'lucide-react';

interface WordData {
  mostUsedWords: Array<{ word: string; count: number }>;
  emojiUsage: Record<string, number>;
  topPhrases: Array<{ phrase: string; count: number }>;
  languageDistribution: {
    english: number;
    tamil: number;
    mixed: number;
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  totalWords: number;
  uniqueWords: number;
}

interface WordCloudVisualizationProps {
  wordData: WordData;
  theme: any;
}

export default function WordCloudVisualization({ wordData, theme }: WordCloudVisualizationProps) {
  const topEmojis = useMemo(() => {
    if (!wordData.emojiUsage) return [];
    
    return Object.entries(wordData.emojiUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 12)
      .map(([emoji, count]) => ({ emoji, count }));
  }, [wordData.emojiUsage]);

  const getWordSize = (count: number, maxCount: number) => {
    const minSize = 12;
    const maxSize = 32;
    const ratio = count / maxCount;
    return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
  };

  const getWordColor = (index: number) => {
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
      '#ec4899', // pink-500
      '#8b5cf6', // violet-500
      '#06b6d4', // cyan-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
    ];
    return colors[index % colors.length];
  };

  const maxWordCount = wordData.mostUsedWords?.[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Word Cloud */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-pink-500" />
            Word Cloud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-64 p-6 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-lg">
            <div className="flex flex-wrap gap-3 justify-center items-center">
              {wordData.mostUsedWords?.slice(0, 50).map((word, index) => (
                <motion.span
                  key={word.word}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="inline-block px-3 py-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-110"
                  style={{
                    fontSize: `${getWordSize(word.count, maxWordCount)}px`,
                    color: getWordColor(index),
                    backgroundColor: `${getWordColor(index)}15`,
                    border: `1px solid ${getWordColor(index)}30`
                  }}
                  title={`Used ${word.count} times`}
                >
                  {word.word}
                </motion.span>
              ))}
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">
                {wordData.totalWords?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600">Total Words</div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {wordData.uniqueWords?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600">Unique Words</div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {wordData.mostUsedWords?.[0]?.count || 0}
              </div>
              <div className="text-sm text-gray-600">Most Used Word</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emoji Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-yellow-500" />
            Emoji Love Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {topEmojis.map((emoji, index) => (
              <motion.div
                key={emoji.emoji}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-2">{emoji.emoji}</div>
                <div className="text-sm font-semibold text-gray-700">{emoji.count}</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Phrases */}
      {wordData.topPhrases && wordData.topPhrases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Special Phrases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wordData.topPhrases.slice(0, 10).map((phrase, index) => (
                <motion.div
                  key={phrase.phrase}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-red-50 rounded-lg"
                >
                  <span className="text-gray-700 font-medium">"{phrase.phrase}"</span>
                  <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                    {phrase.count}x
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Language Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">English</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(wordData.languageDistribution?.english || 0) / 
                        Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="bg-blue-500 h-2 rounded-full"
                  />
                </div>
                <span className="text-sm text-gray-600 w-12">
                  {Math.round((wordData.languageDistribution?.english || 0) / 
                    Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Tamil</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(wordData.languageDistribution?.tamil || 0) / 
                        Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="bg-orange-500 h-2 rounded-full"
                  />
                </div>
                <span className="text-sm text-gray-600 w-12">
                  {Math.round((wordData.languageDistribution?.tamil || 0) / 
                    Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Tanglish (Mixed)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(wordData.languageDistribution?.mixed || 0) / 
                        Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="bg-purple-500 h-2 rounded-full"
                  />
                </div>
                <span className="text-sm text-gray-600 w-12">
                  {Math.round((wordData.languageDistribution?.mixed || 0) / 
                    Math.max(1, Object.values(wordData.languageDistribution || {}).reduce((a, b) => a + b, 0)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}