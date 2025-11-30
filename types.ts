export interface ConjugationSet {
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
  auxiliary: string;
  participle: string;
  gerund: string;
  tenses: {
    present: ConjugationSet;
    imperfect: ConjugationSet;
    pastRemote: ConjugationSet; // Passato Remoto
    future: ConjugationSet;
    conditional: ConjugationSet;
    subjunctivePresent: ConjugationSet;
    subjunctiveImperfect: ConjugationSet;
  }
}