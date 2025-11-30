import { VerbEntry, ConjugationSet } from '../types';

export const parseCSV = (csvText: string): Record<string, VerbEntry> => {
  const lines = csvText.trim().split('\n');
  const verbMap: Record<string, VerbEntry> = {};

  const parseLine = (text: string): string[] => {
    // Basic CSV parser (handles commas inside quotes if any)
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') { inQuote = !inQuote; } 
      else if (char === ',' && !inQuote) { result.push(cur); cur = ''; } 
      else { cur += char; }
    }
    result.push(cur);
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  // Start from 2 to skip header rows
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseLine(line);
    if (cols.length < 40) continue;

    const infinitive = cols[0].toLowerCase();
    
    const getConjugation = (startIdx: number): ConjugationSet => ({
      io: cols[startIdx],
      tu: cols[startIdx + 1],
      lui_lei: cols[startIdx + 2],
      noi: cols[startIdx + 3],
      voi: cols[startIdx + 4],
      loro: cols[startIdx + 5],
    });

    const entry: VerbEntry = {
      infinitive,
      definition: cols[1],
      auxiliary: cols[8],
      participle: cols[9],
      gerund: cols[10],
      tenses: {
        present: getConjugation(2),
        imperfect: getConjugation(11),
        pastRemote: getConjugation(17),
        future: getConjugation(23),
        subjunctivePresent: getConjugation(29),
        subjunctiveImperfect: getConjugation(35),
        conditional: getConjugation(41)
      }
    };

    verbMap[infinitive] = entry;

    const allForms = [
      ...Object.values(entry.tenses.present),
      ...Object.values(entry.tenses.imperfect),
      ...Object.values(entry.tenses.pastRemote),
      ...Object.values(entry.tenses.future),
      entry.participle
    ];

    allForms.forEach(form => {
        if (form && form !== '-' && form.length > 2) {
            verbMap[form.toLowerCase()] = entry;
        }
    });
  }

  return verbMap;
};