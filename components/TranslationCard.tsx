import React, { useState } from 'react';
import { VerbEntry, ConjugationSet } from '../types';

interface TranslationCardProps {
  word: string;
  entry: VerbEntry;
  style: React.CSSProperties;
}

export default function TranslationCard({ word, entry, style }: TranslationCardProps) {
  const [activeTab, setActiveTab] = useState<'present' | 'past' | 'future'>('present');
  const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");

  const ConjugationItem = ({ label, value }: { label: string, value: string }) => {
    const isMatch = value.toLowerCase() === cleanWord;
    return (
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
          {label}
        </span>
        <span className={`text-sm leading-tight ${isMatch ? 'font-bold text-indigo-600' : 'text-slate-700'}`}>
          {value}
        </span>
      </div>
    );
  };

  // Select which tense to show based on the tab
  let currentConjugation: ConjugationSet;
  if (activeTab === 'present') currentConjugation = entry.tenses.present;
  else if (activeTab === 'past') currentConjugation = entry.tenses.imperfect; // Using Imperfect for 'Past' tab
  else currentConjugation = entry.tenses.future;

  return (
    <div 
      className="fixed z-50 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto"
      style={style}
    >
      <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
        <h3 className="font-bold text-lg text-slate-900 capitalize">{entry.infinitive}</h3>
        <p className="text-sm text-slate-500">{entry.definition}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 text-xs font-medium text-center bg-white">
        <button 
          onClick={() => setActiveTab('present')}
          className={`flex-1 py-2 hover:bg-slate-50 ${activeTab === 'present' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >
          Present
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 hover:bg-slate-50 ${activeTab === 'past' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >
          Imperfect
        </button>
        <button 
          onClick={() => setActiveTab('future')}
          className={`flex-1 py-2 hover:bg-slate-50 ${activeTab === 'future' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >
          Future
        </button>
      </div>

      <div className="px-4 py-3 bg-white">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <ConjugationItem label="io" value={currentConjugation.io} />
          <ConjugationItem label="tu" value={currentConjugation.tu} />
          <ConjugationItem label="lui/lei" value={currentConjugation.lui_lei} />
          <ConjugationItem label="noi" value={currentConjugation.noi} />
          <ConjugationItem label="voi" value={currentConjugation.voi} />
          <ConjugationItem label="loro" value={currentConjugation.loro} />
        </div>
      </div>
    </div>
  );
}