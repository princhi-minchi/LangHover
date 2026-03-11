import React from 'react';

interface DefinitionCardProps {
    word: string;
    translation: string;
    darkMode?: boolean;
}

export default function DefinitionCard({ word, translation, darkMode }: DefinitionCardProps) {
    return (
        <div className={`w-full font-sans flex flex-col ${darkMode ? 'bg-slate-900' : ''}`}>
            {/* Header */}
            <div className={`px-4 pt-3 pb-2 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <h3 className={`font-bold text-lg capitalize flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {word}
                </h3>
            </div>

            {/* Content */}
            <div className={`px-5 py-5 max-h-[300px] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex flex-col gap-1 items-start">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Translation</span>
                    <span className={`text-xl font-medium tracking-wide ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                        {translation || 'Translation unavailable'}
                    </span>
                </div>
            </div>
        </div>
    );
}
