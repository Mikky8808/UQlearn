import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Advert } from '../../types';
import { getAdvertsApi } from '../../lib/apiConfig';

interface AdvertBannerProps {
  slot?: 'super_deals' | 'tailored_for_you' | 'deals' | 'tailored' | string;
  className?: string;
  fallbackAdvert?: Partial<Advert>;
}

export const AdvertBanner: React.FC<AdvertBannerProps> = ({
  slot = 'super_deals',
  className = '',
  fallbackAdvert,
}) => {
  const [advert, setAdvert] = useState<Advert | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const fetchAdvert = async () => {
    try {
      setLoading(true);
      const res = await getAdvertsApi(slot, true);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAdvert(res.data[0]);
        setImgError(false);
      } else if (fallbackAdvert && fallbackAdvert.imageUrl) {
        setAdvert(fallbackAdvert as Advert);
        setImgError(false);
      } else {
        setAdvert(null);
      }
    } catch (err) {
      console.warn(`Could not load advert for slot ${slot}:`, err);
      if (fallbackAdvert && fallbackAdvert.imageUrl) {
        setAdvert(fallbackAdvert as Advert);
      } else {
        setAdvert(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvert();

    // Listen for custom event when admin updates adverts in real-time
    const handleUpdate = () => {
      fetchAdvert();
    };

    window.addEventListener('uqlearn_advert_updated', handleUpdate);
    return () => window.removeEventListener('uqlearn_advert_updated', handleUpdate);
  }, [slot]);

  if (loading && !advert) {
    return null;
  }

  if (!advert || !advert.imageUrl || imgError) {
    return null;
  }

  const imgUrl = advert.imageUrl || advert.image_url || '';
  const linkUrl = advert.linkUrl || advert.link_url || '';
  const title = advert.title || advert.altText || advert.alt_text || 'Special Promotion';
  const hasLink = Boolean(linkUrl && linkUrl.trim() !== '');

  const BannerGraphic = (
    <div
      className={`w-full relative flex items-center justify-center overflow-hidden rounded-sm shadow-none border-none ${className}`}
      style={{ backgroundColor: advert.bgColor || advert.bg_color || 'transparent' }}
    >
      {/* Advert Image Display - Matches Section Cards Width */}
      <img
        src={imgUrl}
        alt={advert.altText || advert.alt_text || title}
        onError={() => setImgError(true)}
        className="w-full h-auto max-h-[220px] sm:max-h-[300px] md:max-h-[380px] lg:max-h-[440px] rounded-sm object-cover object-center select-none block shadow-none transition-none"
        referrerPolicy="no-referrer"
        loading="lazy"
      />

      {/* Optional Badge if configured in admin */}
      {advert.badgeText && (
        <div className="absolute top-3 left-4 sm:top-4 sm:left-6 z-10 pointer-events-none">
          <span className="px-3 py-1 rounded-sm text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center space-x-1 shadow-none">
            <Sparkles className="w-3 h-3" />
            <span>{advert.badgeText}</span>
          </span>
        </div>
      )}
    </div>
  );

  if (hasLink) {
    return (
      <div className="w-full my-3 sm:my-4 shadow-none">
        <a
          href={linkUrl}
          target={linkUrl.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block w-full cursor-pointer focus:outline-none rounded-sm shadow-none transition-none"
          title={title}
        >
          {BannerGraphic}
        </a>
      </div>
    );
  }

  return <div className="w-full my-3 sm:my-4 shadow-none">{BannerGraphic}</div>;
};
