import React, { useState, useEffect } from 'react';
import { HeroBanner as HeroBannerType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../../lib/apiConfig';

export const HeroBanner: React.FC = () => {
  const [banners, setBanners] = useState<HeroBannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadBanners = async () => {
      try {
        const cached = localStorage.getItem('uqlearn_hero_banners');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              setBanners(parsed.filter((b: any) => b.isActive !== false).slice(0, 10));
            }
          } catch (e) {}
        }

        const res = await apiFetch('media-upload.php?action=list_banners', { silent: true }, 1).catch(() => null);
        if (res && res.success && Array.isArray(res.data) && isMounted) {
          const active = res.data.filter((b: any) => b.isActive !== false).slice(0, 10);
          setBanners(active);
          localStorage.setItem('uqlearn_hero_banners', JSON.stringify(res.data));
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBanners();
    return () => { isMounted = false; };
  }, []);

  // 2-second interval between banners
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  if (loading && banners.length === 0) {
    return (
      <div className="w-full h-[160px] md:h-[260px] lg:h-[320px] bg-slate-100 dark:bg-slate-900 animate-pulse" />
    );
  }

  const safeIndex = currentIndex >= banners.length ? 0 : currentIndex;
  const activeBanner = banners.length > 0 ? banners[safeIndex] : {
    id: 'default',
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    isActive: true,
    order: 0
  };

  return (
    <div 
      className="w-full bg-white dark:bg-slate-950 p-4 md:p-8 lg:p-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full h-[160px] md:h-[260px] lg:h-[320px] overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner.id || `banner-${safeIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img 
                src={activeBanner.imageUrl} 
                alt="Hero Banner"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator if multiple banners */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full">
              {banners.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCurrentIndex(dotIdx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    safeIndex === dotIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
