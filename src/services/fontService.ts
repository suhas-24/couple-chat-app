/**
 * Font loading service for Tamil and multi-language support
 */

export interface FontConfig {
  family: string;
  url: string;
  weight?: string;
  style?: string;
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}

export const TAMIL_FONTS: FontConfig[] = [
  {
    family: 'Noto Sans Tamil',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;500;600;700&display=swap',
    display: 'swap',
  },
  {
    family: 'Mukti',
    url: 'https://fonts.googleapis.com/css2?family=Mukti:wght@400;700&display=swap',
    display: 'swap',
  },
];

export const FALLBACK_FONTS = [
  'Latha',
  'Vijaya',
  'Tamil Sangam MN',
  'InaiMathi',
  'system-ui',
  'sans-serif',
];

class FontService {
  private loadedFonts = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  /**
   * Loads Tamil fonts asynchronously
   */
  async loadTamilFonts(): Promise<void> {
    const loadPromises = TAMIL_FONTS.map(font => this.loadFont(font));
    await Promise.allSettled(loadPromises);
  }

  /**
   * Loads a specific font configuration
   */
  async loadFont(config: FontConfig): Promise<void> {
    if (this.loadedFonts.has(config.family)) {
      return;
    }

    if (this.loadingPromises.has(config.family)) {
      return this.loadingPromises.get(config.family);
    }

    const loadPromise = this.loadFontInternal(config);
    this.loadingPromises.set(config.family, loadPromise);

    try {
      await loadPromise;
      this.loadedFonts.add(config.family);
    } catch (error) {
      console.warn(`Failed to load font ${config.family}:`, error);
    } finally {
      this.loadingPromises.delete(config.family);
    }
  }

  private async loadFontInternal(config: FontConfig): Promise<void> {
    if (typeof window === 'undefined') return;

    // Method 1: Try using CSS Font Loading API
    if ('fonts' in document) {
      try {
        const fontFace = new FontFace(
          config.family,
          `url(${config.url})`,
          {
            weight: config.weight || 'normal',
            style: config.style || 'normal',
            display: config.display || 'swap',
          }
        );

        await fontFace.load();
        document.fonts.add(fontFace);
        return;
      } catch (error) {
        console.warn(`CSS Font Loading API failed for ${config.family}:`, error);
      }
    }

    // Method 2: Fallback to link element
    return this.loadFontViaLink(config);
  }

  private loadFontViaLink(config: FontConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingLink = document.querySelector(`link[href="${config.url}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = config.url;
      link.crossOrigin = 'anonymous';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load font from ${config.url}`));

      document.head.appendChild(link);

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error(`Font loading timeout for ${config.url}`));
      }, 10000);
    });
  }

  /**
   * Checks if a font is available in the system
   */
  isFontAvailable(fontFamily: string): boolean {
    if (typeof window === 'undefined') return false;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return false;

    // Test with a character that should render differently
    const testChar = 'அ';
    
    context.font = `16px monospace`;
    const fallbackWidth = context.measureText(testChar).width;
    
    context.font = `16px "${fontFamily}", monospace`;
    const testWidth = context.measureText(testChar).width;
    
    return testWidth !== fallbackWidth;
  }

  /**
   * Gets the best available Tamil font
   */
  getBestTamilFont(): string {
    const availableFonts = [
      ...TAMIL_FONTS.map(f => f.family),
      ...FALLBACK_FONTS,
    ];

    for (const font of availableFonts) {
      if (this.isFontAvailable(font)) {
        return font;
      }
    }

    return 'sans-serif';
  }

  /**
   * Preloads fonts for better performance
   */
  preloadFonts(): void {
    if (typeof window === 'undefined') return;

    TAMIL_FONTS.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = font.url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Gets font loading status
   */
  getFontLoadingStatus(): {
    loaded: string[];
    loading: string[];
    total: number;
  } {
    return {
      loaded: Array.from(this.loadedFonts),
      loading: Array.from(this.loadingPromises.keys()),
      total: TAMIL_FONTS.length,
    };
  }
}

export const fontService = new FontService();

// Auto-load Tamil fonts on service initialization
if (typeof window !== 'undefined') {
  fontService.preloadFonts();
  fontService.loadTamilFonts().catch(console.warn);
}