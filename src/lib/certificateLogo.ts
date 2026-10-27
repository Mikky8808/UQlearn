/**
 * Official UQlearn Certificate Logo Asset
 * Provides embedded data URI for offline SVG rendering, PDF generation, and high-DPI canvas exports.
 */
import { ROOT_URL } from "./apiConfig";
import { resolveBrandingLogoUrl } from "./branding";

export const UQLEARN_OFFICIAL_LOGO_DATA_URL = `${ROOT_URL}/logo/logo.png`;

export function resolveCertificateLogo(customLogoUrl?: string | null): string {
  if (!customLogoUrl || typeof customLogoUrl !== "string" || !customLogoUrl.trim()) {
    return UQLEARN_OFFICIAL_LOGO_DATA_URL;
  }

  const trimmed = customLogoUrl.trim();
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  if (
    trimmed.endsWith("/logo/logo.png") ||
    trimmed.endsWith("/logo/logo.svg") ||
    trimmed === UQLEARN_OFFICIAL_LOGO_DATA_URL ||
    trimmed === `${ROOT_URL}/logo/logo.svg`
  ) {
    return UQLEARN_OFFICIAL_LOGO_DATA_URL;
  }

  return resolveBrandingLogoUrl(trimmed);
}

/**
 * Loads an external image URL and converts it into a base64 Data URL
 * to avoid canvas tainting during SVG-to-Canvas exports.
 */
export async function convertImageUrlToDataUri(url: string): Promise<string> {
  if (!url || url.startsWith("data:image/")) return url;
  
  // If it's the internal logo path, we should ideally still convert it to base64 if possible
  // but for local assets in development/production it usually works without tainting if served from same origin.

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return UQLEARN_OFFICIAL_LOGO_DATA_URL;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : UQLEARN_OFFICIAL_LOGO_DATA_URL);
      };
      reader.onerror = () => resolve(UQLEARN_OFFICIAL_LOGO_DATA_URL);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Could not convert image to data URI, using default certificate logo:", e);
    return UQLEARN_OFFICIAL_LOGO_DATA_URL;
  }
}
