export interface LanguageInfo {
    isoCode: string;
    ultralinguaName: string;
    displayName: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
    'en': { isoCode: 'en', ultralinguaName: 'english', displayName: 'EN' },
    'es': { isoCode: 'es', ultralinguaName: 'spanish', displayName: 'ES' },
    'fr': { isoCode: 'fr', ultralinguaName: 'french', displayName: 'FR' },
    'de': { isoCode: 'de', ultralinguaName: 'german', displayName: 'DE' },
    'it': { isoCode: 'it', ultralinguaName: 'italian', displayName: 'IT' },
    'pt': { isoCode: 'pt', ultralinguaName: 'portuguese', displayName: 'PT (EU)' },
    'pt-BR': { isoCode: 'pt-BR', ultralinguaName: 'portuguese', displayName: 'PT (BR)' },
    'nl': { isoCode: 'nl', ultralinguaName: 'dutch', displayName: 'NL' },
    // 'ru': { isoCode: 'ru', ultralinguaName: 'russian', displayName: 'RU' }, // Russian conjugations might be unreliable, but keeping it if supported
    // 'la': { isoCode: 'la', ultralinguaName: 'latin', displayName: 'LA' },
};

export const DEFAULT_SOURCE_LANG = 'it';
export const DEFAULT_TARGET_LANG = 'en';
