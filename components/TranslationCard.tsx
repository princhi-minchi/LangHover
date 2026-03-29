import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConjugationLookupResponse } from '../types';

interface TranslationCardProps {
  word: string;
  response: ConjugationLookupResponse;
  style: React.CSSProperties;
  wordTranslation?: string;
  infinitiveTranslation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export default function TranslationCard({ 
  word, 
  response, 
  style, 
  wordTranslation, 
  infinitiveTranslation,
  sourceLanguage,
  targetLanguage
}: TranslationCardProps) {
  const { entry, initialMatch, alternatives } = response;
  
  // 1. Memoize initial indices - MUST be before any conditional returns
  const initialIndices = useMemo(() => {
    if (!entry) return { presetMoodIdx: 0, presetTenseIdx: 0, moodIdx: -1 };
    
    const moodIdx = entry.groups.findIndex(g => g.moodKey === initialMatch?.moodKey);
    const presetMoodIdx = moodIdx !== -1 ? moodIdx : 0;
    
    const tenseIdx = entry.groups[presetMoodIdx]?.tenses.findIndex(t => t.tenseKey === initialMatch?.tenseKey);
    const presetTenseIdx = tenseIdx !== -1 ? tenseIdx : 0;
    
    return { presetMoodIdx, presetTenseIdx, moodIdx };
  }, [entry?.groups, initialMatch?.moodKey, initialMatch?.tenseKey]);

  const [currentMoodIdx, setCurrentMoodIdx] = useState(initialIndices.presetMoodIdx);
  const [currentTenseIdx, setCurrentTenseIdx] = useState(initialIndices.presetTenseIdx);

  // Reset tense if mood changes
  useEffect(() => {
    if (currentMoodIdx !== initialIndices.moodIdx) {
      setCurrentTenseIdx(0);
    } else {
      setCurrentTenseIdx(initialIndices.presetTenseIdx);
    }
  }, [currentMoodIdx, initialIndices.moodIdx, initialIndices.presetTenseIdx]);

  const mood = entry?.groups[currentMoodIdx];
  const tense = mood?.tenses[currentTenseIdx];
  
  const forms = tense?.forms || [];

  // 2. Memoize navigation functions
  const nextMood = useCallback(() => {
    if (!entry) return;
    setCurrentMoodIdx((prev) => (prev + 1) % entry.groups.length);
  }, [entry?.groups.length]);

  const prevMood = useCallback(() => {
    if (!entry) return;
    setCurrentMoodIdx((prev) => (prev - 1 + entry.groups.length) % entry.groups.length);
  }, [entry?.groups.length]);

  const nextTense = useCallback(() => {
    if (!mood) return;
    setCurrentTenseIdx((prev) => (prev + 1) % (mood.tenses.length || 1));
  }, [mood?.tenses.length]);

  const prevTense = useCallback(() => {
    if (!mood) return;
    setCurrentTenseIdx((prev) => (prev - 1 + (mood.tenses.length || 1)) % (mood.tenses.length || 1));
  }, [mood?.tenses.length]);

  // 3. Memoize cleanWord
  const cleanWord = useMemo(() => 
    word ? word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "") : ""
  , [word]);

  const ConjugationItem = useCallback(({ value }: { value?: string }) => {
    if (!value) return <div className="py-0.5 text-slate-300 italic text-xs">...</div>;

    const isInitialMatch = initialMatch && 
                           mood?.moodKey === initialMatch.moodKey && 
                           tense?.tenseKey === initialMatch.tenseKey &&
                           value === initialMatch.storedForm;
    
    const isVisualMatch = cleanWord ? value.toLowerCase().split(/[\s\/]+/).some(part => part === cleanWord) : false;
    const isMatch = isInitialMatch || isVisualMatch;

    return (
      <div className="flex items-center group py-0.5">
        <span className={`text-[14px] tracking-tight transition-all ${isMatch ? 'font-bold text-indigo-600 underline decoration-indigo-200 underline-offset-[4px] decoration-1' : 'text-slate-700 font-medium group-hover:text-slate-900'}`}>
          {value}
        </span>
      </div>
    );
  }, [initialMatch, mood?.moodKey, tense?.tenseKey, cleanWord]);

  // Early return after hooks
  if (!entry || !mood || !tense) return null;

  const NavRow = ({ label, onPrev, onNext, canNav }: { label: string, onPrev: () => void, onNext: () => void, canNav: boolean }) => (
    <div className="flex items-center justify-between px-5 py-1 border-b border-slate-100 bg-white">
      <button 
        onClick={onPrev}
        disabled={!canNav}
        className={`p-1 rounded-full transition-all ${canNav ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95' : 'text-slate-200 cursor-not-allowed'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <span className="text-slate-900 font-bold tracking-tight text-[11px] uppercase px-3 py-0.5 bg-slate-50/50 rounded-lg min-w-[110px] text-center border border-slate-100/30">{label}</span>
      <button 
        onClick={onNext}
        disabled={!canNav}
        className={`p-1 rounded-full transition-all ${canNav ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95' : 'text-slate-200 cursor-not-allowed'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );

  return (
    <div 
      className="fixed z-[2147483647] bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200 ease-out flex flex-col ring-1 ring-slate-900/5 backdrop-blur-xl"
      style={{ ...style, width: '330px' }}
    >
      {/* Header Section */}
      <div className="grid grid-cols-2 bg-gradient-to-br from-white via-white to-slate-50/30 border-b border-slate-100">
        <div className="px-5 py-4 border-r border-slate-100 relative text-left">
          <div className="text-xl font-black text-slate-900 truncate leading-tight" title={word}>{word}</div>
          <div className="text-[12px] font-bold text-indigo-500 mt-0.5 truncate">{wordTranslation || 'Translating...'}</div>
        </div>
        <div className="px-5 py-4 text-left bg-slate-50/20">
          <div className="text-lg font-bold text-slate-800 truncate leading-tight" title={entry.infinitive}>{entry.infinitive}</div>
          <div className="text-[12px] font-medium text-slate-500 mt-0.5 truncate italic">{infinitiveTranslation || 'Translating...'}</div>
        </div>
      </div>

      {/* Navigation Section */}
      <NavRow 
        label={mood.moodLabel} 
        onPrev={prevMood} 
        onNext={nextMood} 
        canNav={entry.groups.length > 1} 
      />
      <NavRow 
        label={tense.tenseLabel} 
        onPrev={prevTense} 
        onNext={nextTense} 
        canNav={mood.tenses.length > 1} 
      />

      {/* Conjugation Grid */}
      <div className="flex-1 p-6 bg-white/40">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <ConjugationItem value={forms[0]} />
          <ConjugationItem value={forms[3]} />
          <ConjugationItem value={forms[1]} />
          <ConjugationItem value={forms[4]} />
          <ConjugationItem value={forms[2]} />
          <ConjugationItem value={forms[5]} />
        </div>
      </div>

      {/* Suggestions Footer */}
      {alternatives.length > 0 && (
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-center backdrop-blur-sm">
          <div className="flex flex-wrap justify-center gap-1.5">
            {alternatives.map((alt) => (
              <button 
                key={alt.infinitive}
                className="px-2.5 py-1 bg-white border border-slate-200 text-indigo-600 font-bold rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-[10px]"
              >
                {alt.infinitive}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
