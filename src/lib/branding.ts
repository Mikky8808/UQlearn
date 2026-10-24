/**
 * Dynamic Branding & Favicon Manager
 * Handles syncing database logo path with the browser tab favicon, title, and open-graph meta tags.
 */
import { ROOT_URL } from './apiConfig';

export const DEFAULT_LOGO_URL = `${ROOT_URL}/logo/logo.svg`;
export const DEFAULT_LOGO_SVG_URL = `${ROOT_URL}/logo/logo.svg`;

/**
 * Resolves a database or uploaded logo path to an absolute/loadable image URL.
 */
export function resolveBrandingLogoUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_LOGO_URL;
  }

  const trimmed = url.trim();

  if (
    trimmed === '/logo/logo.png' ||
    trimmed === '/logo/logo.svg' ||
    trimmed.endsWith('/logo/logo.png') ||
    trimmed.endsWith('/logo/logo.svg') ||
    trimmed.includes('kalani_logo')
  ) {
    return DEFAULT_LOGO_URL;
  }

  // Data URLs or custom external URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const cleanRoot = ROOT_URL.replace('https://', '').replace('http://', '');
    if (hostname.includes(cleanRoot) || hostname.includes('uqlearn.org') || hostname.includes('ais-dev') || hostname.includes('ais-pre')) {
      if (cleanPath.startsWith('/logo/') || cleanPath.startsWith('/uploads/') || cleanPath.startsWith('/images/')) {
        return `${ROOT_URL}${cleanPath}`;
      }
    }
  }

  return cleanPath;
}

/**
 * Resolves general course or avatar images to prevent subdomain 404 errors.
 */
export function resolveImageUrl(url?: string | null, fallbackType: 'logo' | 'course' | 'avatar' = 'course'): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    if (fallbackType === 'logo') return DEFAULT_LOGO_URL;
    if (fallbackType === 'avatar') return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
  }

  if (fallbackType === 'logo') {
    return resolveBrandingLogoUrl(url);
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const cleanRoot = ROOT_URL.replace('https://', '').replace('http://', '');
    if (hostname.includes(cleanRoot) || hostname.includes('ais-dev') || hostname.includes('ais-pre')) {
      if (cleanPath.startsWith('/uploads/') || cleanPath.startsWith('/images/')) {
        return `${ROOT_URL}${cleanPath}`;
      }
    }
  }

  return cleanPath;
}

/**
 * Dynamically updates the browser favicon and mobile touch icons to the database logo path.
 */
export function updateDocumentFavicon(rawUrl?: string | null): void {
  if (typeof document === 'undefined') return;

  const resolvedUrl = resolveBrandingLogoUrl(rawUrl);

  const iconTypes = [
    { rel: 'icon', type: getMimeType(resolvedUrl) },
    { rel: 'shortcut icon', type: getMimeType(resolvedUrl) },
    { rel: 'apple-touch-icon', type: 'image/png' }
  ];

  iconTypes.forEach(({ rel, type }) => {
    let link: HTMLLinkElement | null = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = resolvedUrl;
    if (type) {
      link.type = type;
    }
  });

  // Also update OpenGraph and Twitter social card preview images
  updateMetaTag('property', 'og:image', resolvedUrl);
  updateMetaTag('name', 'twitter:image', resolvedUrl);
}

function getMimeType(url: string): string {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
  if (cleanUrl.endsWith('.ico')) return 'image/x-icon';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function updateMetaTag(attributeName: 'property' | 'name', attributeValue: string, content: string): void {
  let meta: HTMLMetaElement | null = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attributeName, attributeValue);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}
