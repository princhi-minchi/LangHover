// API Configuration for different environments
export interface ApiConfig {
  baseUrl: string;
  environment: 'development' | 'production';
}

export const getApiConfig = (): ApiConfig => {
  // MANUAL OVERRIDE: Force development mode for testing
  // Comment this out for production
  console.log('[API Config] MANUAL OVERRIDE: Forcing development mode');
  return {
    baseUrl: 'http://localhost:8787',
    environment: 'development'
  };

  // Check if we're in development mode - more comprehensive checks
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    
    // Explicit development checks
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      hostname.includes('dev') ||
      hostname.includes('local') ||
      // Check if we're running on a local development server
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      console.log('[API Config] Using development environment');
      return {
        baseUrl: 'http://localhost:8787',
        environment: 'development'
      };
    }
  }
  
  // For Chrome extension content scripts, window.location might be undefined
  // In that case, we need to check if we're in a development context
  if (typeof window !== 'undefined' && !window.location) {
    // We're likely in a Chrome extension content script
    // Try to detect if we're in development by checking if we can access localhost
    console.log('[API Config] Chrome extension detected, defaulting to development');
    return {
      baseUrl: 'http://localhost:8787',
      environment: 'development'
    };
  }
  
  // Production environment
  console.log('[API Config] Using production environment');
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
