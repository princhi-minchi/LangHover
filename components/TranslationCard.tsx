import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VerbEntry, ConjugationSet } from '../types';
import { TENSE_DISPLAY_NAMES } from '../utils/tenseMapping';

const PARTICIPLE_KEYS = [
  'presentparticiple',
  'gerund',
  'pastparticiple',
  'pastparticiplemasculinesingular',
  'pastparticiplemasculineplural',
  'pastparticiplefemininesingular',
  'pastparticiplefeminineplural'
];

interface TranslationCardProps {
  word: string;
  entry: VerbEntry;
  translation?: string | null;
  infinitiveTranslation?: string | null;
  enabledTenses?: string[];
  initialTense?: string;
}

interface ConjugationItemProps {
  label: string;
  value: string;
  cleanWord: string;
}

const ConjugationItem: React.FC<ConjugationItemProps> = ({ label, value, cleanWord }) => {
  const displayValue = value || '-';
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

export default function TranslationCard({ word, entry, translation, infinitiveTranslation, enabledTenses, initialTense }: TranslationCardProps) {
  // Determine effective initial tense (mapping participles to the group)
  const effectiveInitialTense = useMemo(() => {
    if (initialTense && PARTICIPLE_KEYS.includes(initialTense)) {
      return 'Participles';
    }
    return initialTense;
  }, [initialTense]);
  // Get available tenses from the entry
  // Filter based on enabledTenses, but ALWAYS include the initialTense (temporary override)
  // Get available tenses from the entry
  // Filter based on enabledTenses, but ALWAYS include the initialTense (temporary override)
  // Get available tenses from the entry
  // Filter based on enabledTenses, but ALWAYS include the initialTense (temporary override)
  // Get available tenses from the entry
  // Filter based on enabledTenses, but ALWAYS include the initialTense (temporary override)
  const availableTenses = useMemo(() => {
    let tenses = Object.keys(entry.tenses).filter(tense => {
      // We will handle PARTICIPLE_KEYS separately in the "Participles" group, 
      // so filter them out from the main list unconditionally
      if (PARTICIPLE_KEYS.includes(tense)) return false;

      // Logic for enabledTenses
      const isEnabled = enabledTenses ? enabledTenses.includes(tense) : true;
      // Always show initialTense if it exists
      if (initialTense && tense === initialTense) return true;

      return isEnabled;
    });

    // Check if we have any participle keys in the entry to decide if we show "Participles" tab
    const hasParticiples = PARTICIPLE_KEYS.some(key => entry.tenses[key]);
    if (hasParticiples) {
      // Add "Participles" at the beginning
      return ['Participles', ...tenses];
    }

    return tenses;
  }, [entry.tenses, enabledTenses, initialTense]);

  // Default to effectiveInitialTense if available, otherwise 'present', otherwise first available
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (effectiveInitialTense && availableTenses.includes(effectiveInitialTense)) return effectiveInitialTense;
    if (availableTenses.includes('present')) return 'present';
    return availableTenses[0] || '';
  });

  const tabsRef = useRef<HTMLDivElement>(null);
  const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");

  // Update active tab if entry changes
  useEffect(() => {
    // If we have an explicit initialTense, switch to it
    if (effectiveInitialTense && availableTenses.includes(effectiveInitialTense)) {
      setActiveTab(effectiveInitialTense);
    } else if (!availableTenses.includes(activeTab) && availableTenses.length > 0) {
      if (availableTenses.includes('present')) {
        setActiveTab('present');
      } else {
        setActiveTab(availableTenses[0]);
      }
    }
  }, [entry.infinitive, effectiveInitialTense, availableTenses]);

  // Auto-scroll logic for tabs to ensure active tab is visible
  useEffect(() => {
    if (tabsRef.current) {
      const index = availableTenses.indexOf(activeTab);
      if (index >= 0 && tabsRef.current.children[index]) {
        const tabElement = tabsRef.current.children[index] as HTMLElement;
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab, availableTenses]);


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

  let currentConjugation: ConjugationSet | undefined;

  if (activeTab === 'Participles') {
    // Construct synthetic conjugation set for Participles
    const syntheticSet: ConjugationSet = {};
    PARTICIPLE_KEYS.forEach(key => {
      if (entry.tenses[key]) {
        // extract the value. Usually these are single values.
        // The entry.tenses[key] is a ConjugationSet (object).
        // We need to display it as Label -> Value.
        // The existing ConjugationItem expects label and value.
        // We want the Label to be the TENSE NAME (e.g. "Present Participle").
        // The Value is the content of the set.

        // Since these are "participles", they likely have just one 'form' or 'singular/plural' inside,
        // OR the API adapter put them in a set with some key.
        // Let's grab the values.
        const cachedSet = entry.tenses[key];
        const values = Object.values(cachedSet);
        if (values.length > 0) {
          // We map the display name as the key for our synthetic set
          // tenseMapping gives us "Present Participle", "Gerund", etc.
          const displayName = TENSE_DISPLAY_NAMES[key] || key;
          syntheticSet[displayName] = values.join(', '); // Join just in case multiple forms exist, though unlikely for these specific keys based on typical data
        }
      }
    });
    currentConjugation = syntheticSet;
  } else {
    currentConjugation = entry.tenses[activeTab];
  }

  // Format label using our mapping
  const formatLabel = (key: string) => {
    return TENSE_DISPLAY_NAMES[key] || key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Helper to order standard keys
  const getOrderedKeys = (conj: ConjugationSet) => {
    const standardOrder = ['io', 'tu', 'lui_lei', 'noi', 'voi', 'loro'];
    const keys = Object.keys(conj);
    const hasAllStandard = standardOrder.every(k => keys.includes(k));
    if (hasAllStandard) return standardOrder;
    return keys;
  };

  return (
    <div
      className="w-72 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-bold text-lg text-slate-900 capitalize flex items-center gap-2">
            {word}
            <span className="text-sm font-normal italic text-slate-500">
              ({entry.infinitive})
            </span>
          </h3>
        </div>
        <p className="text-sm text-slate-500 truncate flex items-center gap-2">
          {translation === undefined || translation === null ? (
            <span className="opacity-50">Loading translation...</span>
          ) : (
            <>
              <span>{translation}</span>
              {infinitiveTranslation && (
                <span className="text-xs italic opacity-75">
                  ({infinitiveTranslation})
                </span>
              )}
            </>
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

        {/* Scroll Area */}
        <div
          ref={tabsRef}
          className="flex-1 flex overflow-x-auto scrollbar-hide scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {availableTenses.map((tenseKey) => (
            <button
              key={tenseKey}
              onClick={() => setActiveTab(tenseKey)}
              className={`
                flex-none px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                ${activeTab === tenseKey
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              {formatLabel(tenseKey)}
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
            {getOrderedKeys(currentConjugation).map(key => (
              <ConjugationItem key={key} label={key.replace('_', '/')} value={currentConjugation[key]} cleanWord={cleanWord} />
            ))}
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
