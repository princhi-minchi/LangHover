import React from 'react';

interface PhraseOverlayProps {
    originalText: string;
    translation: string | null;
    highlightedWords?: string[];
}

export default function PhraseOverlay({ originalText, translation, highlightedWords }: PhraseOverlayProps) {
    const renderTranslation = () => {
        if (!translation) return <span className="animate-pulse text-slate-400">Translating...</span>;
        if (translation === 'Error') return "Error loading translation";

        if (!highlightedWords || highlightedWords.length === 0) return translation;

        // Simple tokenizer that preserves spaces/punctuation for reconstruction could be complex.
        // For simplicity, we split by space and rejoin with space.
        // A better approach if we want perfect punctuation is deeper regex splitting,
        // but for now let's try splitting by spaces.
        return translation.split(' ').map((token, i) => {
            // Clean token for comparison
            const cleanToken = token.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");
            // Check if this token matches any highlighted word
            // We use simple includes check. highlightedWords are expected to be lowercased or normal cased.
            // But compromise output might slightly vary. 
            // Let's assume exact text match from compromise.

            // Actually, let's look at how we got highlightedWords.
            // We used: doc.verbs().out('array') -> this returns the text of the verb phrase.
            // It might be "have eaten" as one string?
            // If compromise returns "have eaten", we need to check if 'token' is part of it?
            // Or we can rely on single word verbs for now or exact match ??

            // To be robust: Check if the token is part of any highlighted entry
            const isHighlighted = highlightedWords.some(hw =>
                hw.toLowerCase().split(' ').includes(cleanToken)
            );

            return (
                <span key={i} className={isHighlighted ? "font-bold text-indigo-600 bg-indigo-50 px-0.5 rounded -mx-0.5 relative z-10" : ""}>
                    {token}{' '}
                </span>
            );
        });
    };

    return (
        <div
            className="max-w-md bg-white/90 backdrop-blur-md rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden font-sans pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
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
