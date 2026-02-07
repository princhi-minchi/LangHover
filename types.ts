export interface ConjugationSet {
  [key: string]: string; // "io", "tu", "lui", "first singular", etc.
}

export interface VerbEntry {
  infinitive: string;
  definition: string;
  auxiliary?: string;
  participle?: string;
  gerund?: string;
  tenses: Record<string, ConjugationSet>;
}

export interface UltralinguaConjugation {
  surfaceform: string;
  partofspeech: {
    person: string;
    tense: string;
    number: string;
    partofspeechcategory: string;
  };
}

export interface UltralinguaResponseItem {
  infinitive: string;
  conjugations: UltralinguaConjugation[];
}

export interface UltralinguaDefinition {
  text: string;
  definitions: {
    text: string;
    partofspeech: {
      partofspeechcategory: string;
    };
  }[];
}