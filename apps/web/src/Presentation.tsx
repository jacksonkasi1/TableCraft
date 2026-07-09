import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Play, Pause } from 'lucide-react';
import { cn } from './components/LiquidCard';

interface PresentationProps {
  slides: React.ReactNode[];
}

export const Presentation: React.FC<PresentationProps> = ({ slides }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        nextSlide();
      } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        prevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleFullscreen]);

  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    handleMouseMove();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    if (!isPlaying) return;
    const slideTimeout = setTimeout(() => {
      nextSlide();
    }, 10000);
    return () => clearTimeout(slideTimeout);
  }, [currentSlide, isPlaying, nextSlide]);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black text-white"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      {slides.map((slide, index) => {
        const isCurrent = index === currentSlide;
        const isPast = index < currentSlide;
        
        let transform = 'scale(1)';
        if (isPast) transform = 'scale(0.95)';
        else if (!isCurrent) transform = 'scale(1.05)';

        return (
          <div
            key={index}
            className={cn(
              "absolute inset-0 transition-all duration-500 ease-in-out flex flex-col justify-center items-center z-10",
              isCurrent ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            style={{ transform }}
          >
            {slide}
          </div>
        );
      })}

      {/* Keyboard Hint */}
      <div
        className={cn(
          "absolute top-6 right-8 text-[11px] text-white/40 tracking-wider transition-opacity duration-300 z-50 pointer-events-none",
          controlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        ← → Navigate · F Fullscreen
      </div>

      {/* Bottom Controls */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent flex items-end pb-8 px-[5.2%] transition-opacity duration-300 z-50",
          controlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between w-full">
          {/* Left: Counter */}
          <div className="text-white/50 text-[13px] tabular-nums font-medium w-24">
            {currentSlide + 1} / {totalSlides}
          </div>

          {/* Center: Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 ease-out cursor-pointer",
                  index === currentSlide ? "w-6 bg-white/90" : "w-1.5 bg-white/30 hover:bg-white/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(index);
                }}
              />
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1 w-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
              className="p-1.5 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors mr-1"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="p-1.5 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="p-1.5 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-1.5 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};