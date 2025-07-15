import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  lazy?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  quality = 75,
  sizes,
  fill = false,
  style,
  onLoad,
  onError,
  fallbackSrc,
  lazy = true,
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    } else {
      setImageError(true);
    }
    onError?.();
  };

  // Generate blur placeholder
  const generateBlurDataURL = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a gradient blur effect
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#fce7f3');
      gradient.addColorStop(1, '#f3e8ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL();
  };

  // Error fallback component
  if (imageError) {
    return (
      <div
        ref={imgRef}
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height, ...style }}
      >
        <div className="text-center text-gray-400">
          <svg
            className="w-8 h-8 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">Image not available</p>
        </div>
      </div>
    );
  }

  // Loading placeholder
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-100 animate-pulse ${className}`}
        style={{ width, height, ...style }}
      />
    );
  }

  return (
    <div ref={imgRef} className={`relative ${className}`} style={style}>
      <Image
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={
          blurDataURL || 
          (placeholder === 'blur' && width && height 
            ? generateBlurDataURL(width, height) 
            : undefined)
        }
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
        </div>
      )}
    </div>
  );
};

// Avatar component with optimized loading
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  if (!src) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold ${className}`}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizePixels[size]}
      height={sizePixels[size]}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      quality={90}
      priority={size === 'lg' || size === 'xl'} // Prioritize larger avatars
      fallbackSrc="/default-avatar.png"
    />
  );
};

// Gallery component with lazy loading
interface GalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}

export const Gallery: React.FC<GalleryProps> = ({
  images,
  columns = 3,
  gap = 4,
  className = '',
}) => {
  return (
    <div
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {images.map((image, index) => (
        <OptimizedImage
          key={index}
          src={image.src}
          alt={image.alt}
          width={image.width || 300}
          height={image.height || 200}
          className="rounded-lg object-cover w-full h-full"
          sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${100 / columns}vw`}
          lazy={index > 6} // Don't lazy load first 6 images
        />
      ))}
    </div>
  );
};

// Background image component with optimization
interface BackgroundImageProps {
  src: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  src,
  alt,
  children,
  className = '',
  overlay = false,
  overlayOpacity = 0.5,
}) => {
  return (
    <div className={`relative ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default OptimizedImage;