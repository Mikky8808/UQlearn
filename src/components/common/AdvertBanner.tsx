import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Advert } from '../../types';
import { getAdvertsApi } from '../../lib/apiConfig';

interface AdvertBannerProps {
  slot?: 'super_deals' | 'tailored_for_you' | 'deals' | 'tailored' | string;
  className?: string;
  fallbackAdvert?: Partial<Advert>;
  maxBanners?: number;
  intervalMs?: number;
}

export const AdvertBanner: React.FC<AdvertBannerProps> = ({
  slot = 'super_deals',
  className = '',
  fallbackAdvert,
  maxBanners = 10,
  intervalMs = 2000, // 2-second interval between banners
}) => {
  const [banners, setBanners] = useState<Advert[]>([]);
  // With cloned boundary slides, index 1 corresponds to the first actual banner
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string | number, boolean>>({});

  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdvertsApi(slot, true);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const valid = res.data
          .filter((b: any) => b && (b.imageUrl || b.image_url))
          .slice(0, maxBanners);

        if (valid.length > 0) {
          setBanners(valid);
          setCurrentIndex(1);
          setIsTransitioning(true);
          return;
        }
      }

      // Fallback advert if provided
      if (fallbackAdvert && (fallbackAdvert.imageUrl || fallbackAdvert.image_url)) {
        setBanners([fallbackAdvert as Advert]);
        setCurrentIndex(1);
        setIsTransitioning(true);
      } else {
        setBanners([]);
      }
    } catch (err) {
      console.warn(`Could not load section adverts for slot ${slot}:`, err);
      if (fallbackAdvert && (fallbackAdvert.imageUrl || fallbackAdvert.image_url)) {
        setBanners([fallbackAdvert as Advert]);
        setCurrentIndex(1);
        setIsTransitioning(true);
      } else {
        setBanners([]);
      }
    } finally {
      setLoading(false);
    }
  }, [slot, fallbackAdvert, maxBanners]);

  useEffect(() => {
    fetchBanners();

    // Listen for custom event when admin updates section adverts in real-time
    const handleUpdate = () => {
      fetchBanners();
    };

    window.addEventListener('uqlearn_advert_updated', handleUpdate);
    return () => window.removeEventListener('uqlearn_advert_updated', handleUpdate);
  }, [fetchBanners]);

  // Filter out any banners with broken image URLs
  const activeBanners = banners.filter((b, idx) => {
    const key = b.id ?? idx;
    return !imgErrors[key];
  });

  // Seamless infinite loop: Clone last banner at start and first banner at end
  const slides = activeBanners.length > 1
    ? [activeBanners[activeBanners.length - 1], ...activeBanners, activeBanners[0]]
    : activeBanners;

  // Re-enable CSS transition after seamless boundary repositioning
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  // Handle seamless infinite loop jump on transition end
  const handleTransitionEnd = () => {
    if (activeBanners.length <= 1) return;

    if (currentIndex >= activeBanners.length + 1) {
      // Reached the trailing clone of banner 0; snap back to real banner 0 (index 1) without animation
      setIsTransitioning(false);
      setCurrentIndex(1);
    } else if (currentIndex <= 0) {
      // Reached the leading clone of the last banner; snap to real last banner without animation
      setIsTransitioning(false);
      setCurrentIndex(activeBanners.length);
    }
  };

  // Continuous auto-advance every 2 seconds (2000ms) forward into the loop
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, intervalMs]);

  if (loading && banners.length === 0) {
    return null;
  }

  if (activeBanners.length === 0) {
    return null;
  }

  // When only 1 banner exists, render static banner without carousel overhead
  if (activeBanners.length === 1) {
    const adv = activeBanners[0];
    const imgUrl = adv.imageUrl || adv.image_url || '';
    const linkUrl = adv.linkUrl || adv.link_url || '';
    const title = adv.title || adv.altText || adv.alt_text || 'Special Promotion';
    const hasLink = Boolean(linkUrl && linkUrl.trim() !== '');

    const Content = (
      <div
        className="w-full relative flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
        style={{ backgroundColor: adv.bgColor || adv.bg_color || '#0f172a' }}
      >
        <img
          src={imgUrl}
          alt={adv.altText || adv.alt_text || title}
          className="w-full h-auto max-h-[200px] sm:max-h-[280px] md:max-h-[360px] lg:max-h-[420px] object-cover object-center select-none block"
          referrerPolicy="no-referrer"
          loading="eager"
        />
        {adv.badgeText && (
          <div className="absolute top-3 left-4 sm:top-4 sm:left-6 z-10 pointer-events-none">
            <span className="px-2.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center space-x-1 shadow-md">
              <Sparkles className="w-3 h-3" />
              <span>{adv.badgeText}</span>
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div className={`w-full my-3 sm:my-4 select-none ${className}`}>
        {hasLink ? (
          <a
            href={linkUrl}
            target={linkUrl.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="block w-full cursor-pointer focus:outline-none"
            title={title}
          >
            {Content}
          </a>
        ) : (
          Content
        )}
      </div>
    );
  }

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const isSwipeLeft = distance > 45;
    const isSwipeRight = distance < -45;

    if (isSwipeLeft) {
      handleNext();
    } else if (isSwipeRight) {
      handlePrev();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Active dot index mapped from currentIndex (1..N)
  const activeDot = (currentIndex - 1 + activeBanners.length) % activeBanners.length;

  return (
    <div
      className={`w-full my-3 sm:my-4 relative select-none group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Section Promotion Banner"
    >
      {/* Outer Banner Frame */}
      <div className="w-full relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800/80 bg-slate-900">
        {/* Slides Track - Continuous infinite forward glide without rewinding backwards */}
        <div
          className="flex w-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning
              ? 'transform 700ms cubic-bezier(0.25, 1, 0.5, 1)'
              : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((adv, idx) => {
            const imgUrl = adv.imageUrl || adv.image_url || '';
            const linkUrl = adv.linkUrl || adv.link_url || '';
            const title = adv.title || adv.altText || adv.alt_text || `Promotion`;
            const hasLink = Boolean(linkUrl && linkUrl.trim() !== '');
            const slideKey = `slide-${idx}-${adv.id ?? ''}`;

            const SlideContent = (
              <div
                className="w-full relative flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: adv.bgColor || adv.bg_color || '#0f172a' }}
              >
                <img
                  src={imgUrl}
                  alt={adv.altText || adv.alt_text || title}
                  onError={() => {
                    const originalKey = adv.id ?? (idx - 1);
                    setImgErrors((prev) => ({ ...prev, [originalKey]: true }));
                  }}
                  className="w-full h-auto max-h-[200px] sm:max-h-[280px] md:max-h-[360px] lg:max-h-[420px] object-cover object-center select-none block shadow-none transition-none"
                  referrerPolicy="no-referrer"
                  loading={idx <= 2 ? 'eager' : 'lazy'}
                />

                {adv.badgeText && (
                  <div className="absolute top-3 left-4 sm:top-4 sm:left-6 z-10 pointer-events-none">
                    <span className="px-2.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center space-x-1 shadow-md">
                      <Sparkles className="w-3 h-3" />
                      <span>{adv.badgeText}</span>
                    </span>
                  </div>
                )}
              </div>
            );

            return (
              <div
                key={slideKey}
                className="w-full min-w-full flex-shrink-0"
              >
                {hasLink ? (
                  <a
                    href={linkUrl}
                    target={linkUrl.startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="block w-full cursor-pointer focus:outline-none"
                    title={title}
                  >
                    {SlideContent}
                  </a>
                ) : (
                  SlideContent
                )}
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation Arrows */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md z-20"
          title="Previous banner"
          aria-label="Previous banner"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 -translate-x-0.5" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md z-20"
          title="Next banner"
          aria-label="Next banner"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 translate-x-0.5" />
        </button>

        {/* Carousel Indicators / Dots (Clean, no 1/2 or 2/2 counter) */}
        <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 sm:space-x-2 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-auto">
          {activeBanners.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsTransitioning(true);
                setCurrentIndex(dotIdx + 1);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                activeDot === dotIdx
                  ? 'w-5 sm:w-6 h-1.5 bg-white shadow-xs'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              title={`Go to banner ${dotIdx + 1}`}
              aria-label={`Slide ${dotIdx + 1} of ${activeBanners.length}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
