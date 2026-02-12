import React from 'react';
import { UltralinguaDefinitionItem } from '../types';

interface DefinitionCardProps {
    word: string;
    definitions: UltralinguaDefinitionItem[];
    style: React.CSSProperties;
}

export default function DefinitionCard({ word, definitions, style }: DefinitionCardProps) {
    return (
        <div
            className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
            style={style}
        >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 capitalize flex items-center gap-2">
                    {word}
                    <span className="text-sm font-normal italic text-slate-500">
                        (definitions)
                    </span>
                </h3>
            </div>

            {/* Content */}
            <div className="max-h-[300px] overflow-y-auto">
                {definitions.map((def, index) => (
                    <div key={index} className="px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-baseline justify-between mb-1">
                            <span className="font-semibold text-slate-800">{def.root || def.text}</span>
                            <span className="text-xs text-slate-400 italic bg-slate-100 px-1.5 py-0.5 rounded">
                                {def.partofspeech?.partofspeechcategory}
                                {def.partofspeech?.number ? `, ${def.partofspeech.number}` : ''}
                            </span>
                        </div>

                        {def.clarification && def.clarification.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {def.clarification.map((clar, i) => (
                                    <span key={i} className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                        {clar}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* If clarification is missing, showing text as fallback or additional info if needed. 
                For the example provided, 'text' is often same as root, so we might not need to show it if redundant. 
                But let's show it if different? 
                Actually the example JSON has text same as root mostly. 
                Let's stick to root + clarification for now as per "similiar ui to verb overlay" (clean).
            */}
                    </div>
                ))}
            </div>
        </div>
    );
}
