import React from 'react';

interface PhraseOverlayProps {
    originalText: string;
    translation: string | null;
    highlightedWords?: string[];
    darkMode?: boolean;
}

export default function PhraseOverlay({ originalText, translation, highlightedWords, darkMode }: PhraseOverlayProps) {
    const renderTranslation = () => {
        if (!translation) return <span className={`animate-pulse ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Translating...</span>;
        if (translation === 'Error') return "Error loading translation";

        if (!highlightedWords || highlightedWords.length === 0) return translation;

        return translation.split(' ').map((token, i) => {
            const cleanToken = token.toLowerCase().replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()?\"'\[\]]/g, "");
            const isHighlighted = highlightedWords.some(hw =>
                hw.toLowerCase().split(' ').includes(cleanToken)
            );

            return (
                <span key={i} className={isHighlighted
                    ? `font-bold px-0.5 rounded -mx-0.5 relative z-10 ${darkMode ? 'text-indigo-400 bg-indigo-900/50' : 'text-indigo-600 bg-indigo-50'}`
                    : ""}>
                    {token}{' '}
                </span>
            );
        });
    };

    return (
        <div className={`w-full font-sans flex flex-col ${darkMode ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md'}`}>
            <div className="px-4 py-3">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg mt-0.5 ${darkMode ? 'bg-indigo-900/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                        </div>
                        <div>
                            <p className={`text-sm font-medium leading-snug ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {renderTranslation()}
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
