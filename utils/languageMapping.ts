// Re-export from languageConfig for backward compatibility
export { 
  SUPPORTED_LANGUAGES,
  DEFAULT_SOURCE_LANGUAGE as DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANGUAGE as DEFAULT_TARGET_LANG
} from './languageConfig';

// Legacy compatibility exports
export type { LanguageConfig } from './languageConfig';

// Create LanguageInfo interface for backward compatibility
export interface LanguageInfo {
  isoCode: string;
  displayName: string;
}
