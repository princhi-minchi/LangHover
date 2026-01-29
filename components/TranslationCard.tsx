import React, { useState, useRef } from 'react';
import { VerbEntry, ConjugationSet } from '../types';

interface TranslationCardProps {
  word: string;
  entry: VerbEntry;
  style: React.CSSProperties;
  translation?: string | null;
}

// 1. Define the order of tabs (Present -> Passato Prossimo -> Future -> Others)
const TENSE_MAP = [
  { key: 'present', label: 'Present' },
  { key: 'passatoProssimo', label: 'Passato Pros.' }, // New Tab
  { key: 'future', label: 'Future' },
  { key: 'imperfect', label: 'Imperfect' },
  { key: 'pastRemote', label: 'Past Rem.' },
  { key: 'conditional', label: 'Conditional' },
  { key: 'subjunctivePresent', label: 'Subj. Pres.' },
  { key: 'subjunctiveImperfect', label: 'Subj. Imp.' },
] as const;

// 2. Hardcoded conjugations for auxiliaries (to build compound tenses)
const AUX_CONJUGATIONS: Record<string, ConjugationSet> = {
  avere: {
    io: 'ho', tu: 'hai', lui_lei: 'ha',
    noi: 'abbiamo', voi: 'avete', loro: 'hanno'
  },
  essere: {
    io: 'sono', tu: 'sei', lui_lei: 'è',
    noi: 'siamo', voi: 'siete', loro: 'sono'
  }
};

export default function TranslationCard({ word, entry, style, translation }: TranslationCardProps) {
  // Default to Present tense
  const [activeTab, setActiveTab] = useState<string>('present');
  const tabsRef = useRef<HTMLDivElement>(null);

  const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");

  // Scroll logic for the arrows
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 100;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const ConjugationItem = ({ label, value }: { label: string, value: string }) => {
    // Safety check: sometimes data might be missing a field
    const displayValue = value || '-';
    // Check match against the full value (e.g. "ho mangiato") or just the main word
    // We split by spaces to ensure "ha" doesn't match "hanno" (exact word match only)
    const isMatch = displayValue.toLowerCase() === cleanWord ||
      displayValue.toLowerCase().split(' ').some(w => w === cleanWord);

    return (
      <div className="flex flex-col group cursor-default">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5 group-hover:text-indigo-400 transition-colors">
          {label}
        </span>
        <span className={`text-sm leading-tight transition-all ${isMatch ? 'font-bold text-indigo-600 scale-105 origin-left' : 'text-slate-700'}`}>
          {displayValue}
        </span>
      </div>
    );
  };

  // 3. LOGIC TO DETERMINE CONJUGATION DATA
  let currentConjugation: ConjugationSet | null = null;

  if (activeTab === 'passatoProssimo') {
    // DYNAMICALLY BUILD PASSATO PROSSIMO
    // 1. Identify auxiliary (default to avere if missing)
    let auxKey = 'avere';
    if (entry.auxiliary && entry.auxiliary.toLowerCase().includes('essere')) {
      auxKey = 'essere';
    }

    // 2. Get the aux conjugation (ho, hai...)
    const auxSet = AUX_CONJUGATIONS[auxKey];
    const participle = entry.participle || '...';

    // 3. Combine them: "ho" + "mangiato"
    if (auxSet) {
      currentConjugation = {
        io: `${auxSet.io} ${participle}`,
        tu: `${auxSet.tu} ${participle}`,
        lui_lei: `${auxSet.lui_lei} ${participle}`,
        noi: `${auxSet.noi} ${participle}`,
        voi: `${auxSet.voi} ${participle}`,
        loro: `${auxSet.loro} ${participle}`,
      };
    }
  } else {
    // STANDARD LOOKUP for simple tenses stored in the CSV
    // We cast to "keyof typeof" because we know our TENSE_MAP keys match the Type keys (mostly)
    // We ignore 'passatoProssimo' here because we handled it above
    currentConjugation = entry.tenses[activeTab as keyof typeof entry.tenses] as ConjugationSet;
  }

  return (
    <div
      className="fixed z-50 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
      style={style}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
        <div className="flex justify-between items-baseline">
          <h3 className="font-bold text-lg text-slate-900 capitalize">{entry.infinitive}</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
            {entry.auxiliary ? 'aux: ' + entry.auxiliary : 'verb'}
          </span>
        </div>
        <p className="text-sm text-slate-500 italic truncate">
          {translation === undefined || translation === null ? (
            <span className="opacity-50">Loading translation...</span>
          ) : (
            translation
          )}
        </p>
      </div>

      {/* Scrollable Tabs Container */}
      <div className="relative flex items-center bg-white border-b border-slate-100">

        {/* Left Arrow */}
        <button
          onClick={() => scrollTabs('left')}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 z-10"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        {/* Scroll Area (Hidden Scrollbar) */}
        <div
          ref={tabsRef}
          className="flex-1 flex overflow-x-auto scrollbar-hide scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hides scrollbar in Firefox/IE
        >
          {TENSE_MAP.map((tense) => (
            <button
              key={tense.key}
              onClick={() => setActiveTab(tense.key)}
              className={`
                flex-none px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                ${activeTab === tense.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              {tense.label}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollTabs('right')}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 z-10"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Grid Content */}
      <div className="px-4 py-3 bg-white h-[180px] overflow-y-auto">
        {currentConjugation ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <ConjugationItem label="io" value={currentConjugation.io} />
            <ConjugationItem label="tu" value={currentConjugation.tu} />
            <ConjugationItem label="lui/lei" value={currentConjugation.lui_lei} />
            <ConjugationItem label="noi" value={currentConjugation.noi} />
            <ConjugationItem label="voi" value={currentConjugation.voi} />
            <ConjugationItem label="loro" value={currentConjugation.loro} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
            No data for this tense
          </div>
        )}
      </div>
    </div>
  );
}