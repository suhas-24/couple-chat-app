/**
 * Tanglish (Tamil-English) text processing utilities
 * Handles Unicode Tamil characters, language detection, and text rendering optimization
 */

// Tamil Unicode ranges
export const TAMIL_UNICODE_RANGES = {
  // Tamil block (U+0B80–U+0BFF)
  TAMIL_BLOCK: /[\u0B80-\u0BFF]/g,
  // Tamil Supplement (U+11FC0–U+11FFF)
  TAMIL_SUPPLEMENT: /[\u11FC0-\u11FFF]/g,
  // Common Tamil characters
  TAMIL_VOWELS: /[\u0B85-\u0B94]/g,
  TAMIL_CONSONANTS: /[\u0B95-\u0BB9]/g,
  TAMIL_DEPENDENT_VOWELS: /[\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD]/g,
  TAMIL_NUMERALS: /[\u0BE6-\u0BEF]/g,
};

// Language detection patterns
export const LANGUAGE_PATTERNS = {
  TAMIL: TAMIL_UNICODE_RANGES.TAMIL_BLOCK,
  ENGLISH: /[a-zA-Z]/g,
  NUMBERS: /[0-9]/g,
  PUNCTUATION: /[.,!?;:'"()\-\s]/g,
};

export interface LanguageDetectionResult {
  language: 'tamil' | 'english' | 'tanglish' | 'unknown';
  confidence: number;
  tamilPercentage: number;
  englishPercentage: number;
  hasUnicode: boolean;
}

export interface TextSegment {
  text: string;
  language: 'tamil' | 'english' | 'mixed';
  startIndex: number;
  endIndex: number;
}

/**
 * Detects the primary language of text content
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: 'unknown',
      confidence: 0,
      tamilPercentage: 0,
      englishPercentage: 0,
      hasUnicode: false,
    };
  }

  const cleanText = text.replace(LANGUAGE_PATTERNS.PUNCTUATION, '');
  const totalChars = cleanText.length;

  if (totalChars === 0) {
    return {
      language: 'unknown',
      confidence: 0,
      tamilPercentage: 0,
      englishPercentage: 0,
      hasUnicode: false,
    };
  }

  const tamilMatches = cleanText.match(LANGUAGE_PATTERNS.TAMIL) || [];
  const englishMatches = cleanText.match(LANGUAGE_PATTERNS.ENGLISH) || [];

  const tamilCount = tamilMatches.length;
  const englishCount = englishMatches.length;

  const tamilPercentage = (tamilCount / totalChars) * 100;
  const englishPercentage = (englishCount / totalChars) * 100;

  const hasUnicode = tamilCount > 0;

  let language: LanguageDetectionResult['language'];
  let confidence: number;

  if (tamilPercentage > 70) {
    language = 'tamil';
    confidence = Math.min(tamilPercentage / 100, 0.95);
  } else if (englishPercentage > 70) {
    language = 'english';
    confidence = Math.min(englishPercentage / 100, 0.95);
  } else if (tamilPercentage > 10 && englishPercentage > 10) {
    language = 'tanglish';
    confidence = Math.min((tamilPercentage + englishPercentage) / 100, 0.9);
  } else {
    language = 'unknown';
    confidence = 0.1;
  }

  return {
    language,
    confidence,
    tamilPercentage,
    englishPercentage,
    hasUnicode,
  };
}

/**
 * Segments text into language-specific parts for optimized rendering
 */
export function segmentText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let currentLanguage: 'tamil' | 'english' | 'mixed' = 'english';
  let startIndex = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isTamil = LANGUAGE_PATTERNS.TAMIL.test(char);
    const isEnglish = LANGUAGE_PATTERNS.ENGLISH.test(char);
    const isPunctuation = LANGUAGE_PATTERNS.PUNCTUATION.test(char);

    let charLanguage: 'tamil' | 'english' | 'mixed';
    
    if (isTamil) {
      charLanguage = 'tamil';
    } else if (isEnglish) {
      charLanguage = 'english';
    } else {
      charLanguage = currentLanguage; // Keep current language for punctuation/spaces
    }

    // If language changes, save current segment and start new one
    if (charLanguage !== currentLanguage && currentSegment.length > 0) {
      segments.push({
        text: currentSegment,
        language: currentLanguage,
        startIndex,
        endIndex: i - 1,
      });
      
      currentSegment = char;
      currentLanguage = charLanguage;
      startIndex = i;
    } else {
      currentSegment += char;
    }
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push({
      text: currentSegment,
      language: currentLanguage,
      startIndex,
      endIndex: text.length - 1,
    });
  }

  return segments;
}

/**
 * Validates if text contains valid Tamil Unicode characters
 */
export function isValidTamilText(text: string): boolean {
  const tamilChars = text.match(LANGUAGE_PATTERNS.TAMIL);
  if (!tamilChars) return true; // No Tamil chars, so valid

  // Check for common invalid combinations or malformed characters
  // This is a basic validation - can be expanded based on Tamil grammar rules
  return !text.includes('\uFFFD'); // No replacement characters
}

/**
 * Normalizes Tamil text for consistent rendering
 */
export function normalizeTamilText(text: string): string {
  // Normalize Unicode to NFC form for consistent rendering
  let normalized = text.normalize('NFC');
  
  // Remove any replacement characters
  normalized = normalized.replace(/\uFFFD/g, '');
  
  // Additional Tamil-specific normalizations can be added here
  return normalized;
}

/**
 * Gets appropriate font family based on text content
 */
export function getFontFamily(text: string): string {
  const detection = detectLanguage(text);
  
  if (detection.hasUnicode || detection.language === 'tamil' || detection.language === 'tanglish') {
    return 'var(--font-tamil), "Noto Sans Tamil", "Latha", "Vijaya", sans-serif';
  }
  
  return 'var(--font-sans), system-ui, sans-serif';
}

/**
 * Optimizes text rendering by applying appropriate CSS properties
 */
export function getTextRenderingStyles(text: string) {
  const detection = detectLanguage(text);
  
  const baseStyles = {
    fontFamily: getFontFamily(text),
    direction: 'ltr' as const,
    unicodeBidi: 'normal' as const,
    textRendering: 'optimizeLegibility' as const,
  };

  if (detection.hasUnicode) {
    return {
      ...baseStyles,
      fontFeatureSettings: '"liga" 1, "calt" 1',
      fontVariantLigatures: 'common-ligatures',
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    };
  }

  return baseStyles;
}

/**
 * Checks if the browser supports Tamil fonts
 */
export function checkTamilFontSupport(): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) return false;

  // Test with a common Tamil character
  const tamilChar = 'அ';
  
  context.font = '16px sans-serif';
  const fallbackWidth = context.measureText(tamilChar).width;
  
  context.font = '16px "Noto Sans Tamil", sans-serif';
  const tamilWidth = context.measureText(tamilChar).width;
  
  return tamilWidth !== fallbackWidth;
}