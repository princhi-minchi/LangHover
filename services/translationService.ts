// Re-export from centralized ApiService for backward compatibility
export type { 
  TranslationResponse, 
  DeepLTranslationResponse
} from './apiService';

import { apiService } from './apiService';

// Wrapper functions to maintain backward compatibility
export const translateText = async (text: string, targetLang: string = 'en'): Promise<string> => {
  return apiService.translateText(text, targetLang);
};

export const translateWithDeepL = async (text: string, sourceLang: string, targetLang: string = 'en', context?: string): Promise<string> => {
  const result = await apiService.translateWithDeepL({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    context
  });
  return result || 'Error loading translation';
};