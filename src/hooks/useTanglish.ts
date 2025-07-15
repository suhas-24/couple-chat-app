/**
 * React hook for Tanglish text processing and language detection
 */

import { useState, useEffect, useMemo } from 'react';
import {
  detectLanguage,
  segmentText,
  normalizeTamilText,
  getTextRenderingStyles,
  isValidTamilText,
  type LanguageDetectionResult,
  type TextSegment,
} from '@/lib/tanglish';
import { fontService } from '@/services/fontService';

export interface UseTanglishOptions {
  autoDetect?: boolean;
  normalize?: boolean;
  enableSegmentation?: boolean;
}

export interface UseTanglishResult {
  detection: LanguageDetectionResult;
  segments: TextSegment[];
  normalizedText: string;
  renderingStyles: React.CSSProperties;
  isValid: boolean;
  fontLoaded: boolean;
}

/**
 * Hook for processing Tanglish text with language detection and optimization
 */
export function useTanglish(
  text: string,
  options: UseTanglishOptions = {}
): UseTanglishResult {
  const {
    autoDetect = true,
    normalize = true,
    enableSegmentation = false,
  } = options;

  const [fontLoaded, setFontLoaded] = useState(false);

  // Check font loading status
  useEffect(() => {
    const checkFontStatus = () => {
      const status = fontService.getFontLoadingStatus();
      setFontLoaded(status.loaded.length > 0);
    };

    checkFontStatus();
    
    // Check periodically for font loading
    const interval = setInterval(checkFontStatus, 500);
    
    // Clear interval after 10 seconds
    setTimeout(() => clearInterval(interval), 10000);

    return () => clearInterval(interval);
  }, []);

  // Memoized language detection
  const detection = useMemo(() => {
    if (!autoDetect || !text) {
      return {
        language: 'unknown' as const,
        confidence: 0,
        tamilPercentage: 0,
        englishPercentage: 0,
        hasUnicode: false,
      };
    }
    return detectLanguage(text);
  }, [text, autoDetect]);

  // Memoized text segmentation
  const segments = useMemo(() => {
    if (!enableSegmentation || !text) return [];
    return segmentText(text);
  }, [text, enableSegmentation]);

  // Memoized text normalization
  const normalizedText = useMemo(() => {
    if (!normalize || !text) return text;
    return normalizeTamilText(text);
  }, [text, normalize]);

  // Memoized rendering styles
  const renderingStyles = useMemo(() => {
    return getTextRenderingStyles(normalizedText || text);
  }, [normalizedText, text]);

  // Text validation
  const isValid = useMemo(() => {
    return isValidTamilText(text);
  }, [text]);

  return {
    detection,
    segments,
    normalizedText,
    renderingStyles,
    isValid,
    fontLoaded,
  };
}

/**
 * Hook for managing Tamil keyboard input
 */
export function useTamilInput() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [inputMethod, setInputMethod] = useState<'transliteration' | 'direct'>('transliteration');

  const toggleTamilInput = () => {
    setIsEnabled(!isEnabled);
  };

  const switchInputMethod = (method: 'transliteration' | 'direct') => {
    setInputMethod(method);
  };

  // Basic transliteration mapping (can be expanded)
  const transliterate = (englishText: string): string => {
    if (!isEnabled || inputMethod !== 'transliteration') {
      return englishText;
    }

    const transliterationMap: Record<string, string> = {
      'a': 'அ',
      'aa': 'ஆ',
      'i': 'இ',
      'ii': 'ஈ',
      'u': 'உ',
      'uu': 'ஊ',
      'e': 'எ',
      'ee': 'ஏ',
      'ai': 'ஐ',
      'o': 'ஒ',
      'oo': 'ஓ',
      'au': 'ஔ',
      'ka': 'க',
      'nga': 'ங',
      'cha': 'ச',
      'ja': 'ஜ',
      'nya': 'ஞ',
      'ta': 'த',
      'na': 'ன',
      'pa': 'ப',
      'ma': 'ம',
      'ya': 'ய',
      'ra': 'ர',
      'la': 'ல',
      'va': 'வ',
      'zha': 'ழ',
      'lla': 'ள',
      'rra': 'ற',
      'nna': 'ண',
      'sa': 'ஸ',
      'sha': 'ஷ',
      'ha': 'ஹ',
    };

    let result = englishText;
    
    // Sort by length (longest first) to handle multi-character mappings
    const sortedKeys = Object.keys(transliterationMap).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      const regex = new RegExp(key, 'gi');
      result = result.replace(regex, transliterationMap[key]);
    }

    return result;
  };

  return {
    isEnabled,
    inputMethod,
    toggleTamilInput,
    switchInputMethod,
    transliterate,
  };
}

/**
 * Hook for font loading management
 */
export function useFontLoading() {
  const [status, setStatus] = useState(fontService.getFontLoadingStatus());

  useEffect(() => {
    const checkStatus = () => {
      setStatus(fontService.getFontLoadingStatus());
    };

    const interval = setInterval(checkStatus, 1000);
    
    // Stop checking after fonts are loaded or timeout
    setTimeout(() => clearInterval(interval), 15000);

    return () => clearInterval(interval);
  }, []);

  const loadTamilFonts = async () => {
    try {
      await fontService.loadTamilFonts();
      setStatus(fontService.getFontLoadingStatus());
    } catch (error) {
      console.error('Failed to load Tamil fonts:', error);
    }
  };

  return {
    status,
    loadTamilFonts,
    isLoading: status.loading.length > 0,
    isComplete: status.loaded.length === status.total,
  };
}