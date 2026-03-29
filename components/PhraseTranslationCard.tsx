import React from 'react';

interface PhraseTranslationCardProps {
  phrase: string;
  translation?: string;
  style: React.CSSProperties;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export default function PhraseTranslationCard({
  phrase,
  translation,
  style,
  sourceLanguage = 'IT',
  targetLanguage = 'EN'
}: PhraseTranslationCardProps) {
  return (
    <div 
      className="fixed z-[2147483647] bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200 ease-out flex flex-col ring-1 ring-slate-900/5 backdrop-blur-xl"
      style={{ ...style, width: '330px' }}
    >
      {/* Phrase Header */}
      <div className="px-5 py-4 bg-gradient-to-br from-white via-white to-slate-50/30 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
            {sourceLanguage} → {targetLanguage}
          </span>
        </div>
        <div 
          className="text-lg font-black text-slate-900 leading-tight break-words max-h-[120px] overflow-y-auto pr-1" 
          title={phrase}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
        >
          {phrase}
        </div>
      </div>

      {/* Translation Body */}
      <div className="flex-1 p-5 bg-white/40 min-h-[100px] flex flex-col justify-center">
        {translation ? (
          <div className="text-slate-700 font-medium text-[15px] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
            {translation}
          </div>
        ) : (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            <div className="h-4 bg-slate-100 rounded w-4/6"></div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-right backdrop-blur-sm">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5 font-mono">
          <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Powered by DeepL
        </span>
      </div>
    </div>
  );
}
