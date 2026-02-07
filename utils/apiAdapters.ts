import { UltralinguaConjugation, VerbEntry, ConjugationSet } from '../types';

export const adaptConjugationsToVerbEntry = (
    infinitive: string,
    definition: string,
    conjugations: UltralinguaConjugation[]
): VerbEntry => {
    const tenses: Record<string, ConjugationSet> = {};

    // Group by tense
    conjugations.forEach((conj) => {
        if (!conj || !conj.partofspeech) return;

        const tenseName = conj.partofspeech.tense;
        const person = conj.partofspeech.person;
        const number = conj.partofspeech.number;

        if (!tenseName) return;

        if (!tenses[tenseName]) {
            tenses[tenseName] = {};
        }

        // Map Person/Number to a key like "first singular" or just use them
        // We'll map them to our UI expectation: 1st sg -> io, 2nd sg -> tu, etc.
        // Or we can keep them generic strings key.

        // Let's create a standard mapping key for easier UI handling if we want to retain strict order
        let key = `${person} ${number}`;

        // Optional: Map to Italian specific keys "io", "tu" if we want to maintain backward compat logic
        // But since we want to be generic, let's try to map to a standard set if possible, 
        // or just rely on a standard ordering in the UI. 
        // The previous app used 'io', 'tu', etc. clearly. 

        if (person === 'first' && number === 'singular') key = 'io';
        if (person === 'second' && number === 'singular') key = 'tu';
        if (person === 'third' && number === 'singular') key = 'lui_lei';
        if (person === 'first' && number === 'plural') key = 'noi';
        if (person === 'second' && number === 'plural') key = 'voi';
        if (person === 'third' && number === 'plural') key = 'loro';

        let val = conj.surfaceform;
        if (val === null || val === undefined) val = '-';
        if (typeof val !== 'string') {
            console.warn('Unexpected non-string surfaceform:', val, conj);
            val = String(val);
        }

        tenses[tenseName][key] = val;
    });

    // Extract participle if present in any of the items? 
    // Ultralingua usually returns participle as a separate entry or part of tense="past participle"
    // Let's check if there is a 'past participle' tense
    let participle = '';
    if (tenses['past participle']) {
        // Usually it's gendered/numbered, take the singular masculine (default) or just the first one found
        const val = Object.values(tenses['past participle'])[0];
        if (val) participle = val;
    }

    // Attempt to find metadata like auxiliary from definitions is hard here because we only have conjugations.
    // We'd have to rely on what was passed or infer it. 
    // For now, we leave auxiliary undefined or handle it in the service if possible.

    return {
        infinitive,
        definition,
        tenses,
        participle: participle,
        // auxiliary is tricky without more data, might need to leave it blank or fetch extra info
        auxiliary: undefined,
        gerund: undefined
    };
};
