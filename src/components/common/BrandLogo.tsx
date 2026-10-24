import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { resolveBrandingLogoUrl, DEFAULT_LOGO_URL } from '../../lib/branding';

interface BrandLogoProps {
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showImage?: boolean;
  imageSizeClass?: string;
  className?: string;
  textColorClass?: string;
  to?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  id = 'brand-logo',
  size = 'md',
  showImage = true,
  imageSizeClass,
  className = '',
  textColorClass,
  to = '/',
  onClick
}) => {
  const { logoUrl } = useApp();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const resolvedSrc = imgError 
    ? DEFAULT_LOGO_URL 
    : resolveBrandingLogoUrl(logoUrl);

  const getImageDimensions = () => {
    if (imageSizeClass) return imageSizeClass;
    switch (size) {
      case 'sm':
        return 'w-8 h-8 rounded-full p-0.5';
      case 'lg':
        return 'w-12 h-12 rounded-full p-0.5';
      case 'xl':
        return 'w-14 h-14 rounded-full p-0.5';
      case 'md':
      default:
        return 'w-10 h-10 rounded-full p-0.5';
    }
  };

  const getTextSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'lg':
        return 'text-2xl';
      case 'xl':
        return 'text-3xl';
      case 'md':
      default:
        return 'text-xl';
    }
  };

  const content = (
    <div id={id} className={`inline-flex items-center space-x-2.5 group focus:outline-none ${className}`}>
      {showImage && (
        <img
          src={resolvedSrc}
          alt="UQlearn Logo"
          onError={() => setImgError(true)}
          className={`${getImageDimensions()} object-contain group-hover:scale-105 transition-transform drop-shadow-xs`}
          referrerPolicy="no-referrer"
        />
      )}
      <span className={`${getTextSizeClass()} font-black tracking-tight select-none`}>
        <span className="text-teal-600 dark:text-teal-400 group-hover:text-teal-500 transition-colors">
          UQ
        </span>
        <span className={textColorClass || 'text-purple-600 dark:text-purple-400 group-hover:text-purple-500 transition-colors'}>
          learn
        </span>
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="inline-flex focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};


