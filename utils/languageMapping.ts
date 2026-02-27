export interface LanguageInfo {
    isoCode: string;
    ultralinguaName: string;
    displayName: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
    'en': { isoCode: 'en', ultralinguaName: 'english', displayName: 'English' },
    'es': { isoCode: 'es', ultralinguaName: 'spanish', displayName: 'Spanish' },
    'fr': { isoCode: 'fr', ultralinguaName: 'french', displayName: 'French' },
    'de': { isoCode: 'de', ultralinguaName: 'german', displayName: 'German' },
    'it': { isoCode: 'it', ultralinguaName: 'italian', displayName: 'Italian' },
    'pt': { isoCode: 'pt', ultralinguaName: 'portuguese', displayName: 'Portuguese (European)' },
    'pt-BR': { isoCode: 'pt-BR', ultralinguaName: 'portuguese', displayName: 'Portuguese (Brazilian)' },
    'nl': { isoCode: 'nl', ultralinguaName: 'dutch', displayName: 'Dutch' },
    // 'ru': { isoCode: 'ru', ultralinguaName: 'russian', displayName: 'Russian' }, // Russian conjugations might be unreliable, but keeping it if supported
    // 'la': { isoCode: 'la', ultralinguaName: 'latin', displayName: 'Latin' },
};

export const DEFAULT_SOURCE_LANG = 'it';
export const DEFAULT_TARGET_LANG = 'en';
