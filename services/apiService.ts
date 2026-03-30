import { ConjugationLookupResponse } from '../types';
import { 
  getLanguageConfig, 
  isLanguageSupported, 
  getDeepLCode, 
  getApiEndpoint, 
  DEFAULT_SOURCE_LANGUAGE 
} from '../utils/languageConfig';
import { getApiUrl } from '../utils/apiConfig';

// Use centralized API configuration
const API_BASE_URL = getApiUrl('');

// Helper: Check if Chrome extension context is still valid
const isContextValid = (): boolean => {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
};

// Helper: Generates or retrieves a unique User ID from Chrome Storage securely
const getUserId = async (): Promise<string> => {
  return new Promise((resolve) => {
    try {
      if (isContextValid() && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['gubeUserId'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome storage get failed (context invalidated):', chrome.runtime.lastError);
            resolve(crypto.randomUUID());
            return;
          }
          if (result && result.gubeUserId) {
            resolve(result.gubeUserId as string);
          } else {
            const newId = crypto.randomUUID();
            chrome.storage.local.set({ gubeUserId: newId }, () => {
              if (chrome.runtime.lastError) {
                console.warn('Chrome storage set failed (context invalidated):', chrome.runtime.lastError);
              }
              resolve(newId);
            });
          }
        });
      } else {
        // Fallback for dev mode or invalidated context
        resolve(crypto.randomUUID());
      }
    } catch (e) {
      console.warn('Chrome storage access failed (context invalidated):', e);
      resolve(crypto.randomUUID());
    }
  });
};

// API Response Types
export interface DeepLTranslationResponse {
  translations: {
    detected_source_language: string;
    text: string;
  }[];
}

export interface TranslationResponse {
  data: {
    translations: {
      translatedText: string;
      detectedSourceLanguage: string;
    }[];
  };
}

export interface ConjugationLookupRequest {
  selection: string;
  selectionContext: string;
  language?: string; // Optional language override
}

export interface DeepLTranslationRequest {
  text: string;
  target_lang: string;
  source_lang: string;
  context?: string;
}

export interface TranslationRequest {
  q: string;
  target: string;
  format: string;
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Internal request options to control log verbosity
interface InternalRequestOptions extends RequestInit {
  _suppressedStatuses?: number[];
}

// Centralized API Service
export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_BASE_URL;
    console.log(`[API] ApiService initialized with base URL: ${this.baseUrl}`);
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: InternalRequestOptions = {}
  ): Promise<T> {
    const { _suppressedStatuses, ...fetchOptions } = options;
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[API] Making request to: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        ...fetchOptions,
      });

      console.log(`[API] Response status: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        throw new ApiError('Free daily limit reached! Come back tomorrow.', 429);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Suppress console.error if the status is explicitly in _suppressedStatuses
        const isSuppressed = _suppressedStatuses?.includes(response.status);
        if (!isSuppressed) {
          console.error(`[API] Error response body:`, errorText);
        }
        
        throw new ApiError(
          `API request failed: ${response.statusText} (${response.status}) - ${errorText}`,
          response.status,
          response.statusText
        );
      }

      const data = await response.json() as T;
      console.log(`[API] Success: Received data of type ${typeof data}`);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('[API] Network error:', error);
      throw new ApiError(`Network error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generic conjugation lookup for any language
  async lookupConjugation(language: string, request: ConjugationLookupRequest, signal?: AbortSignal): Promise<ConjugationLookupResponse> {
    if (!isLanguageSupported(language)) {
      throw new ApiError(`Language '${language}' is not supported yet.`);
    }

    const endpoint = getApiEndpoint(language);
    if (!endpoint) {
      throw new ApiError(`No API endpoint configured for language '${language}'.`);
    }

    console.log(`Fetching ${language} conjugation lookup with context:`, request.selectionContext.slice(0, 50) + '...');
    
    try {
      const userId = await getUserId();
      const response = await this.makeRequest<ConjugationLookupResponse>(
        `/api/${endpoint}/conjugation-lookup`,
        {
          method: 'POST',
          headers: {
            'x-user-id': userId
          },
          body: JSON.stringify(request),
          signal,
          _suppressedStatuses: [404]
        }
      );

      console.log('API Response status: 200');
      console.log('API Data received:', response);
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        // 404 = no match found; this is an expected outcome, not a real error.
        // Use debug level so it doesn't pollute the Extensions error tab.
        if (error.status === 404) {
          console.debug('[API] Conjugation lookup: no match (404) —', error.message);
        } else {
          console.warn('API error or no match found:', error.message);
        }
      } else {
        console.error('Lookup failed:', error);
      }
      throw error;
    }
  }

  // Italian conjugation lookup (backward compatibility)
  async conjugationLookup(request: ConjugationLookupRequest): Promise<ConjugationLookupResponse> {
    return this.lookupConjugation(DEFAULT_SOURCE_LANGUAGE, request);
  }

  // Enhanced DeepL translation with language validation
  async translateWithDeepL(request: DeepLTranslationRequest, signal?: AbortSignal): Promise<string | undefined> {
    try {
      const userId = await getUserId();
      
      // Normalize language codes to lowercase for validation
      const normalizedSource = request.source_lang.toLowerCase();
      const normalizedTarget = request.target_lang.toLowerCase();
      
      // For translation, we allow any language in our registry (not just conjugation-supported)
      const sourceDeepLCode = getDeepLCode(normalizedSource);
      const targetDeepLCode = getDeepLCode(normalizedTarget);
      
      if (!sourceDeepLCode) {
        throw new Error(`Unsupported source language: ${normalizedSource}`);
      }
      
      if (!targetDeepLCode) {
        throw new Error(`Unsupported target language: ${normalizedTarget}`);
      }
      
      // DeepL expects upper case codes for some target languages like EN-US/EN-GB, but works with EN
      let finalSource = sourceDeepLCode;
      if (finalSource === 'PT-BR' || finalSource === 'PT-PT') {
        finalSource = 'PT';
      }

      let finalTarget = targetDeepLCode;
      if (finalTarget === 'PT') {
        finalTarget = 'PT-PT';
      }

      const requestBody: any = {
        text: request.text,
        source_lang: finalSource,
        target_lang: finalTarget
      };

      if (request.context) {
        requestBody.context = request.context;
      }

      const response = await this.makeRequest<DeepLTranslationResponse>(
        '/api/deepl',
        {
          method: 'POST',
          headers: {
            'x-user-id': userId
          },
          body: JSON.stringify(requestBody),
          signal
        }
      );

      if (response && response.translations && response.translations.length > 0) {
        return response.translations[0].text;
      } else {
        throw new Error('No translation found in DeepL response');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Translation failed:', error.message);
      } else {
        console.error('Translation failed:', error);
      }
      return undefined;
    }
  }

  // Generic translation (legacy support)
  async translateText(text: string, targetLang: string = 'en'): Promise<string> {
    try {
      const userId = await getUserId();

      const response = await this.makeRequest<TranslationResponse>(
        '/api/translate',
        {
          method: 'POST',
          headers: {
            'x-user-id': userId
          },
          body: JSON.stringify({
            q: text,
            target: targetLang,
            format: 'text'
          }),
        }
      );

      if (response.data && response.data.translations && response.data.translations.length > 0) {
        return response.data.translations[0].translatedText;
      } else {
        throw new Error('No translation found in response');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return 'Free daily limit reached! Come back tomorrow.';
      }
      console.error('Error in translateText:', error);
      return 'Error loading translation';
    }
  }

  // Health check method to test API connectivity
  async healthCheck(): Promise<{ status: string; baseUrl: string }> {
    try {
      const response = await this.makeRequest<{ status: string }>('/health', {
        method: 'GET',
      });
      return {
        status: response.status,
        baseUrl: this.baseUrl
      };
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return {
        status: 'error',
        baseUrl: this.baseUrl
      };
    }
  }

  // Get the base URL for testing/debugging
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
