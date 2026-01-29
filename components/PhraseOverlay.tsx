import React from 'react';

interface PhraseOverlayProps {
    originalText: string;
    translation: string | null;
    style: React.CSSProperties;
}

export default function PhraseOverlay({ originalText, translation, style }: PhraseOverlayProps) {
    return (
        <div
            className="fixed z-50 max-w-md bg-white/90 backdrop-blur-md rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
            style={style}
        >
            <div className="px-4 py-3">
                <div className="flex flex-col gap-2">
                    {/* Original Text (Optional, mostly for context if needed, but the user just asked for translation. 
               However, showing the original text in a smaller font is usually good UX. 
               Let's keep it subtle.) */}
                    {/* <p className="text-xs text-slate-400 truncate max-w-xs">{originalText}</p> */}

                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900 leading-snug">
                                {translation || <span className="animate-pulse text-slate-400">Translating...</span>}
                            </p>
                            {translation === 'Error' && (
                                <p className="text-xs text-red-500 mt-1">Could not translate selection.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
