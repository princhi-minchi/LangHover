// Language configuration system for multi-language support

export interface LanguageConfig {
  code: string;
  displayName: string;
  deepLCode: string;
  apiEndpoint: string;
  isDefault: boolean;
  isSupported: boolean; // Backend support flag
}

export interface LanguageRegistry {
  [key: string]: LanguageConfig;
}

export const SUPPORTED_LANGUAGES: LanguageRegistry = {
  it: {
    code: 'it',
    displayName: 'Italian',
    deepLCode: 'IT',
    apiEndpoint: 'italian',
    isDefault: true,
    isSupported: true, // Italian is currently supported
  },
  en: {
    code: 'en',
    displayName: 'English',
    deepLCode: 'EN',
    apiEndpoint: 'english', // Not used for conjugation, but needed for translation
    isDefault: false,
    isSupported: false, // English doesn't need conjugation lookup, but is supported for translation
  },
  es: {
    code: 'es',
    displayName: 'Spanish',
    deepLCode: 'ES',
    apiEndpoint: 'spanish',
    isDefault: false,
    isSupported: false, // Not yet supported
  },
  fr: {
    code: 'fr',
    displayName: 'French',
    deepLCode: 'FR',
    apiEndpoint: 'french',
    isDefault: false,
    isSupported: false, // Not yet supported
  },
  de: {
    code: 'de',
    displayName: 'German',
    deepLCode: 'DE',
    apiEndpoint: 'german',
    isDefault: false,
    isSupported: false, // Not yet supported
  },
  pt: {
    code: 'pt',
    displayName: 'Portuguese',
    deepLCode: 'PT',
    apiEndpoint: 'portuguese',
    isDefault: false,
    isSupported: false, // Not yet supported
  },
  nl: {
    code: 'nl',
    displayName: 'Dutch',
    deepLCode: 'NL',
    apiEndpoint: 'dutch',
    isDefault: false,
    isSupported: false, // Not yet supported
  },
};

export const DEFAULT_SOURCE_LANGUAGE = 'it';
export const DEFAULT_TARGET_LANGUAGE = 'en';

// Utility functions
export const getLanguageConfig = (languageCode: string): LanguageConfig | null => {
  return SUPPORTED_LANGUAGES[languageCode] || null;
};

export const getSupportedLanguages = (): LanguageConfig[] => {
  return Object.values(SUPPORTED_LANGUAGES).filter(lang => lang.isSupported);
};

export const getAllLanguages = (): LanguageConfig[] => {
  return Object.values(SUPPORTED_LANGUAGES);
};

export const getDefaultLanguage = (): LanguageConfig => {
  return Object.values(SUPPORTED_LANGUAGES).find(lang => lang.isDefault) || SUPPORTED_LANGUAGES.it;
};

export const isLanguageSupported = (languageCode: string): boolean => {
  const config = getLanguageConfig(languageCode);
  return config ? config.isSupported : false;
};

export const getDeepLCode = (languageCode: string): string | null => {
  const config = getLanguageConfig(languageCode);
  return config ? config.deepLCode : null;
};

export const getApiEndpoint = (languageCode: string): string | null => {
  const config = getLanguageConfig(languageCode);
  return config ? config.apiEndpoint : null;
};
