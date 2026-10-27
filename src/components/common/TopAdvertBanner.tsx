import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import { TopAdvert } from '../../types';
import { getTopAdvertsApi } from '../../lib/apiConfig';

interface TopAdvertBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const TopAdvertBanner: React.FC<TopAdvertBannerProps> = ({ className = '', onDismiss }) => {
  const [adverts, setAdverts] = useState<TopAdvert[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Check session dismissal state
  useEffect(() => {
    const dismissedSession = sessionStorage.getItem('uqlearn_top_advert_dismissed');
    if (dismissedSession) {
      setIsDismissed(true);
    }
  }, []);

  const fetchActiveAdverts = async () => {
    try {
      setLoading(true);
      const res = await getTopAdvertsApi(true);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAdverts(res.data);
        setImgError(false);
      } else {
        setAdverts([]);
      }
    } catch (err) {
      console.warn('Could not load top advert from API:', err);
      setAdverts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAdverts();

    // Listen for custom event when admin updates adverts
    const handleUpdate = () => {
      sessionStorage.removeItem('uqlearn_top_advert_dismissed');
      setIsDismissed(false);
      fetchActiveAdverts();
    };

    window.addEventListener('uqlearn_top_advert_updated', handleUpdate);
    return () => window.removeEventListener('uqlearn_top_advert_updated', handleUpdate);
  }, []);

  // Cycle through adverts if multiple exist
  useEffect(() => {
    if (adverts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % adverts.length);
      setImgError(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [adverts.length]);

  if (isDismissed || loading || adverts.length === 0 || imgError) {
    return null;
  }

  const advert = adverts[currentIdx];
  if (!advert || !advert.imageUrl) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDismissed(true);
    sessionStorage.setItem('uqlearn_top_advert_dismissed', 'true');
    if (onDismiss) onDismiss();
  };

  const hasLink = Boolean(advert.linkUrl && advert.linkUrl.trim() !== '');

  const BannerContent = (
    <div 
      className="w-full relative flex items-center justify-center overflow-hidden shadow-none border-none"
      style={{ backgroundColor: advert.bgColor || '#090d16' }}
    >
      <div className="w-full relative flex items-center justify-center min-h-[38px] sm:min-h-[48px]">
        {/* Advert Image Display - Full Screen Width */}
        <img
          src={advert.imageUrl}
          alt={advert.altText || advert.title || 'Special Promotion Announcement'}
          onError={() => setImgError(true)}
          className="w-full h-auto max-h-[85px] sm:max-h-[110px] md:max-h-[140px] lg:max-h-[160px] object-cover object-center select-none block shadow-none transition-none"
          referrerPolicy="no-referrer"
          loading="eager"
        />

        {/* Dismiss / Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white transition-colors cursor-pointer z-20 shadow-none"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div id="top-nav-advert-banner" className={`w-full shadow-none border-none z-50 ${className}`}>
      {hasLink ? (
        <a
          href={advert.linkUrl}
          target={advert.linkUrl?.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block w-full cursor-pointer focus:outline-none shadow-none transition-none"
          title={advert.title || 'Click to view announcement'}
        >
          {BannerContent}
        </a>
      ) : (
        BannerContent
      )}
    </div>
  );
};
