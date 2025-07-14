/**
 * Romantic Chart Themes
 * Provides consistent romantic color schemes and styling for analytics charts
 */

export interface RomanticTheme {
  colors: {
    primary: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    positive: string;
    neutral: string;
    negative: string;
    text: string;
    textSecondary: string;
    tooltipBg: string;
    tooltipText: string;
    gridLines: string;
    gradient: string[];
  };
  fonts: {
    primary: string;
    secondary: string;
  };
}

class RomanticChartThemes {
  private static instance: RomanticChartThemes;
  
  private themes: Record<string, RomanticTheme> = {
    romantic: {
      colors: {
        primary: '#ec4899', // pink-500
        primaryLight: 'rgba(236, 72, 153, 0.1)',
        secondary: '#8b5cf6', // violet-500
        accent: '#f97316', // orange-500
        positive: '#10b981', // emerald-500
        neutral: '#6b7280', // gray-500
        negative: '#ef4444', // red-500
        text: '#374151', // gray-700
        textSecondary: '#6b7280', // gray-500
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipText: '#374151',
        gridLines: 'rgba(0, 0, 0, 0.1)',
        gradient: [
          'rgba(236, 72, 153, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Georgia, serif'
      }
    },
    
    sunset: {
      colors: {
        primary: '#f97316', // orange-500
        primaryLight: 'rgba(249, 115, 22, 0.1)',
        secondary: '#ec4899', // pink-500
        accent: '#8b5cf6', // violet-500
        positive: '#10b981',
        neutral: '#6b7280',
        negative: '#ef4444',
        text: '#374151',
        textSecondary: '#6b7280',
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipText: '#374151',
        gridLines: 'rgba(0, 0, 0, 0.1)',
        gradient: [
          'rgba(249, 115, 22, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Georgia, serif'
      }
    },
    
    lavender: {
      colors: {
        primary: '#8b5cf6', // violet-500
        primaryLight: 'rgba(139, 92, 246, 0.1)',
        secondary: '#ec4899', // pink-500
        accent: '#06b6d4', // cyan-500
        positive: '#10b981',
        neutral: '#6b7280',
        negative: '#ef4444',
        text: '#374151',
        textSecondary: '#6b7280',
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipText: '#374151',
        gridLines: 'rgba(0, 0, 0, 0.1)',
        gradient: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Georgia, serif'
      }
    }
  };

  public static getInstance(): RomanticChartThemes {
    if (!RomanticChartThemes.instance) {
      RomanticChartThemes.instance = new RomanticChartThemes();
    }
    return RomanticChartThemes.instance;
  }

  public getTheme(themeName: string = 'romantic'): RomanticTheme {
    return this.themes[themeName] || this.themes.romantic;
  }

  public getAllThemes(): Record<string, RomanticTheme> {
    return { ...this.themes };
  }

  public addTheme(name: string, theme: RomanticTheme): void {
    this.themes[name] = theme;
  }

  /**
   * Get chart options with romantic theme applied
   */
  public getChartOptions(theme: RomanticTheme, customOptions: any = {}): any {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: theme.colors.text,
            font: {
              family: theme.fonts.primary,
              size: 12
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: theme.colors.tooltipBg,
          titleColor: theme.colors.tooltipText,
          bodyColor: theme.colors.tooltipText,
          borderColor: theme.colors.primary,
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            family: theme.fonts.primary,
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            family: theme.fonts.primary,
            size: 12
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: theme.colors.textSecondary,
            font: {
              family: theme.fonts.primary,
              size: 11
            }
          },
          grid: {
            color: theme.colors.gridLines,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: theme.colors.textSecondary,
            font: {
              family: theme.fonts.primary,
              size: 11
            }
          },
          grid: {
            color: theme.colors.gridLines,
            drawBorder: false
          }
        }
      },
      elements: {
        point: {
          radius: 4,
          hoverRadius: 6,
          borderWidth: 2
        },
        line: {
          borderWidth: 3,
          tension: 0.4
        },
        bar: {
          borderRadius: 4,
          borderSkipped: false
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    };

    // Deep merge with custom options
    return this.deepMerge(baseOptions, customOptions);
  }

  /**
   * Generate gradient colors for datasets
   */
  public generateGradientColors(count: number, theme: RomanticTheme): string[] {
    const colors = [];
    const baseColors = theme.colors.gradient;
    
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
  }

  /**
   * Create a linear gradient for canvas context
   */
  public createLinearGradient(
    ctx: CanvasRenderingContext2D,
    startColor: string,
    endColor: string,
    direction: 'vertical' | 'horizontal' = 'vertical'
  ): CanvasGradient {
    const gradient = direction === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
      : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    
    return gradient;
  }

  /**
   * Get romantic color palette for specific data types
   */
  public getColorPalette(type: 'sentiment' | 'activity' | 'language' | 'general', theme: RomanticTheme): string[] {
    switch (type) {
      case 'sentiment':
        return [theme.colors.positive, theme.colors.neutral, theme.colors.negative];
      
      case 'activity':
        return [
          theme.colors.primary,
          theme.colors.secondary,
          theme.colors.accent,
          '#06b6d4', // cyan-500
          '#10b981', // emerald-500
          '#f59e0b'  // amber-500
        ];
      
      case 'language':
        return [
          '#3b82f6', // blue-500 for English
          '#f97316', // orange-500 for Tamil
          '#8b5cf6'  // violet-500 for Mixed
        ];
      
      default:
        return theme.colors.gradient;
    }
  }

  /**
   * Deep merge utility function
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Export singleton instance
export default RomanticChartThemes.getInstance();