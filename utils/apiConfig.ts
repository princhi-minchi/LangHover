// API Configuration for different environments
export interface ApiConfig {
  baseUrl: string;
  environment: 'development' | 'production';
}

export const getApiConfig = (): ApiConfig => {
  // Check if we're running on a local dev server (Vite dev mode only)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return {
        baseUrl: 'http://localhost:8787',
        environment: 'development'
      };
    }
  }

  // Production — covers packaged Chrome extension content scripts
  // (window.location in a content script reflects the host page URL, not a local address)
  return {
    baseUrl: 'https://gube-proxy.raunaksbs.workers.dev',
    environment: 'production'
  };
};

// Helper function to get API endpoint URLs
export const getApiUrl = (endpoint: string): string => {
  const config = getApiConfig();
  return `${config.baseUrl}${endpoint}`;
};
