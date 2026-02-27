import React from 'react';

interface DefinitionCardProps {
    word: string;
    translation: string;
}

export default function DefinitionCard({ word, translation }: DefinitionCardProps) {
    return (
        <div
            className="w-80 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 capitalize flex items-center gap-2">
                    {word}
                </h3>
            </div>

            {/* Content */}
            <div className="px-5 py-5 max-h-[300px] overflow-y-auto bg-white">
                <div className="flex flex-col gap-1 items-start">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Translation</span>
                    <span className="text-xl font-medium text-indigo-700 tracking-wide">
                        {translation || 'Translation unavailable'}
                    </span>
                </div>
            </div>
        </div>
    );
}
