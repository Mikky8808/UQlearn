import React, { useState, useEffect } from 'react';
import { HeroBanner as HeroBannerType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../../lib/apiConfig';

export const HeroBanner: React.FC = () => {
  const [banners, setBanners] = useState<HeroBannerType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadBanners = async () => {
      try {
        const cached = localStorage.getItem('uqlearn_hero_banners');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              setBanners(parsed.filter((b: any) => b.isActive !== false));
            }
          } catch (e) {}
        }

        const res = await apiFetch('media-upload.php?action=list_banners', { silent: true }, 1).catch(() => null);
        if (res && res.success && Array.isArray(res.data) && isMounted) {
          const active = res.data.filter((b: any) => b.isActive !== false);
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

  if (loading) {
    return (
      <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-900 animate-pulse rounded-none" />
    );
  }

  // Fallback banner if none are configured in Firestore
  const activeBanner = banners.length > 0 ? banners[0] : {
    id: 'default',
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    isActive: true,
    order: 0
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 p-4 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full h-[160px] md:h-[260px] lg:h-[320px] overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner.id || 'default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img 
                src={activeBanner.imageUrl} 
                alt="Hero Banner"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
