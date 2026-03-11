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
  enabledTenses?: string[];
  initialTense?: string;
  darkMode?: boolean;
}

interface ConjugationItemProps {
  label: string;
  value: string;
  cleanWord: string;
  darkMode?: boolean;
}

const ConjugationItem: React.FC<ConjugationItemProps> = ({ label, value, cleanWord, darkMode }) => {
  const displayValue = value || '-';
  const isMatch = displayValue.toLowerCase() === cleanWord ||
    displayValue.toLowerCase().split(' ').some(w => w === cleanWord);

  return (
    <div className="flex flex-col group cursor-default">
      <span className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 transition-colors ${darkMode
        ? 'text-slate-500 group-hover:text-indigo-400'
        : 'text-slate-400 group-hover:text-indigo-400'}`}>
        {label}
      </span>
      <span className={`text-sm leading-tight transition-all ${isMatch
        ? `font-bold scale-105 origin-left ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`
        : darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {displayValue}
      </span>
    </div>
  );
};

export default function TranslationCard({ word, entry, translation, enabledTenses, initialTense, darkMode }: TranslationCardProps) {
  // Determine effective initial tense (mapping participles to the group)
  const effectiveInitialTense = useMemo(() => {
    if (initialTense && PARTICIPLE_KEYS.includes(initialTense)) {
      return 'Participles';
    }
    return initialTense;
  }, [initialTense]);

  const availableTenses = useMemo(() => {
    let tenses = Object.keys(entry.tenses).filter(tense => {
      if (PARTICIPLE_KEYS.includes(tense)) return false;
      const isEnabled = enabledTenses ? enabledTenses.includes(tense) : true;
      if (initialTense && tense === initialTense) return true;
      return isEnabled;
    });

    const hasParticiples = PARTICIPLE_KEYS.some(key => entry.tenses[key]);
    if (hasParticiples) {
      return ['Participles', ...tenses];
    }

    return tenses;
  }, [entry.tenses, enabledTenses, initialTense]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (effectiveInitialTense && availableTenses.includes(effectiveInitialTense)) return effectiveInitialTense;
    if (availableTenses.includes('present')) return 'present';
    return availableTenses[0] || '';
  });

  const tabsRef = useRef<HTMLDivElement>(null);
  const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()?\"'\[\]]/g, "");

  useEffect(() => {
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
    const syntheticSet: ConjugationSet = {};
    PARTICIPLE_KEYS.forEach(key => {
      if (entry.tenses[key]) {
        const cachedSet = entry.tenses[key];
        const values = Object.values(cachedSet);
        if (values.length > 0) {
          const displayName = TENSE_DISPLAY_NAMES[key] || key;
          syntheticSet[displayName] = values.join(', ');
        }
      }
    });
    currentConjugation = syntheticSet;
  } else {
    currentConjugation = entry.tenses[activeTab];
  }

  const formatLabel = (key: string) => {
    return TENSE_DISPLAY_NAMES[key] || key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const getOrderedKeys = (conj: ConjugationSet) => {
    const standardOrder = ['io', 'tu', 'lui_lei', 'noi', 'voi', 'loro'];
    const keys = Object.keys(conj);
    const hasAllStandard = standardOrder.every(k => keys.includes(k));
    if (hasAllStandard) return standardOrder;
    return keys;
  };

  return (
    <div className={`w-full font-sans flex flex-col ${darkMode ? 'bg-slate-900' : ''}`}>
      {/* Header */}
      <div className={`px-4 pt-3 pb-2 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`font-bold text-lg capitalize flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {word}
            <span className={`text-sm font-normal italic ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              ({entry.infinitive})
            </span>
          </h3>
        </div>
        <p className={`text-sm truncate flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {translation === undefined || translation === null ? (
            <span className="opacity-50">Loading translation...</span>
          ) : (
            <><span>{translation}</span></>
          )}
        </p>
      </div>

      {/* Scrollable Tabs Container */}
      <div className={`relative flex items-center border-b ${darkMode ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-100'}`}
        style={darkMode ? { backgroundColor: '#1a2332' } : {}}>
        {/* Left Arrow */}
        <button
          onClick={() => scrollTabs('left')}
          className={`p-2 z-10 transition-colors ${darkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        {/* Scroll Area */}
        <div
          ref={tabsRef}
          className="flex-1 flex overflow-x-auto scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {availableTenses.map((tenseKey) => (
            <button
              key={tenseKey}
              onClick={() => setActiveTab(tenseKey)}
              className={`
                flex-none px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                ${activeTab === tenseKey
                  ? darkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/20'
                    : 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
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
          className={`p-2 z-10 transition-colors ${darkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Grid Content */}
      <div className={`px-4 py-3 h-[180px] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {currentConjugation ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {getOrderedKeys(currentConjugation).map(key => (
              <ConjugationItem key={key} label={key.replace('_', '/')} value={currentConjugation[key]} cleanWord={cleanWord} darkMode={darkMode} />
            ))}
          </div>
        ) : (
          <div className={`flex items-center justify-center h-full text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            No data for this tense
          </div>
        )}
      </div>
    </div>
  );
}
