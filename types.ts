import React from 'react';

export interface VerbConjugation {
  io: string;
  tu: string;
  lui_lei: string;
  noi: string;
  voi: string;
  loro: string;
}

export interface VerbEntry {
  infinitive: string;
  definition: string;
  conjugation: VerbConjugation;
}

export interface ResponseTense {
    tenseKey: string;
    tenseLabel: string;
    forms: string[];
}

export interface ResponseGroup {
    moodKey: string;
    moodLabel: string;
    tenses: ResponseTense[];
}

export interface ConjugationLookupResponse {
    language: string; // Changed from 'it' to string for multi-language support
    selection: string;
    chosenInfinitive: string | null;
    lookup: {
        matchedToken: string;
        strategy: 'surface' | 'normalized' | 'accentless';
    };
    initialMatch: {
        moodKey: string;
        moodLabel: string;
        tenseKey: string;
        tenseLabel: string;
        formIndex: number;
        storedForm: string;
        matchMode: string;
    } | null;
    alternatives: Array<{
        infinitive: string;
        initialMatch: ConjugationLookupResponse['initialMatch'];
    }>;
    entry: {
        infinitive: string;
        groups: ResponseGroup[];
        definition?: string;
    } | null;
}

export interface SelectionState {
  word: string;
  response: ConjugationLookupResponse;
  style: React.CSSProperties;
  wordTranslation?: string;
  infinitiveTranslation?: string;
  sourceLanguage?: string; // Added for multi-language support
  targetLanguage?: string; // Added for multi-language support
}

export enum SearchStatus {
  IDLE = 'IDLE',
  FOUND = 'FOUND',
  NOT_FOUND = 'NOT_FOUND',
}
