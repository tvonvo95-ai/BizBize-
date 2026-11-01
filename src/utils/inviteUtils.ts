// Helper utility for generating and validating public production invite links

export interface InviteUrlStatus {
  isPublic: boolean;
  url: string | null;
  reason?: string;
  isCustom?: boolean;
}

const DEFAULT_FIREBASE_HOSTING_URL = 'https://bizbize-7b76f.web.app';
const STORAGE_KEY = 'bizbize_custom_public_url';

/**
 * Checks if the current origin is a private development/preview URL that will 404 on external devices
 */
export const isInternalDevOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // Local development
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return true;
    }

    // AI Studio web interface
    if (host.includes('aistudio.google.com')) {
      return true;
    }

    // Google Cloud Run internal development container (ais-dev-...)
    if (host.startsWith('ais-dev-') && host.endsWith('.run.app')) {
      return true;
    }

    // Internal Google corporate domains
    if (host.endsWith('.corp.google.com')) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
};

/**
 * Gets the current custom public URL configured by the user, if any
 */
export const getCustomPublicUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? saved.trim() : null;
};

/**
 * Saves a custom public URL (e.g. Firebase Hosting or custom domain)
 */
export const setCustomPublicUrl = (url: string | null): void => {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    // Remove trailing slash
    clean = clean.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY, clean);
  }
};

/**
 * Gets the default Firebase Hosting domain for this project
 */
export const getDefaultFirebaseHostingUrl = (): string => {
  return DEFAULT_FIREBASE_HOSTING_URL;
};

/**
 * Determines whether a valid, publicly reachable URL is available for sharing.
 * Returns isPublic: false if the user is in AI Studio / internal dev container and has no verified public URL.
 */
export const getPublicInviteUrl = (): InviteUrlStatus => {
  // 1. Check user-configured public URL
  const customUrl = getCustomPublicUrl();
  if (customUrl) {
    return {
      isPublic: true,
      url: customUrl,
      isCustom: true,
    };
  }

  // 2. Check environment variable if provided
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !isInternalDevOrigin(envUrl)) {
    return {
      isPublic: true,
      url: envUrl.trim().replace(/\/+$/, ''),
      isCustom: false,
    };
  }

  // 3. Inspect window.location.origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (!isInternalDevOrigin(origin)) {
      // It is a real public domain (e.g. *.web.app, *.firebaseapp.com, or custom domain)
      return {
        isPublic: true,
        url: origin,
        isCustom: false,
      };
    }
  }

  // 4. In internal dev/preview and no public URL configured
  return {
    isPublic: false,
    url: null,
    reason:
      'Uygulama şu anda AI Studio geliştirme/önizleme ortamında (ais-dev... / aistudio.google.com). Bu bağlantı Google oturumu gerektirir ve başka bir telefonda açıldığında 404 hatası verir.',
  };
};

/**
 * Builds the complete invite message text
 */
export const buildInviteMessage = (publicUrl: string): string => {
  return `BizBize ❤️ uygulamasına katıl ve benimle anlık mesajlaş! Bağlantı: ${publicUrl}`;
};
