import React, { useEffect, useRef, useState } from 'react';
import './index.css';
import { useDarkMode } from './utils/useDarkMode';

const PROXY_BASE = 'https://gube-proxy.raunaksbs.workers.dev/api';

interface TranslationEntry {
    word: string;
    context: string;
    translation: string;
    isVerb?: boolean;
    infinitive?: string | null;
    sourceLang?: string;
    targetLang?: string;
    timestamp: number;
}

async function getUserId(): Promise<string> {
    return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['gubeUserId'], (result) => {
                if (result.gubeUserId) {
                    resolve(result.gubeUserId as string);
                } else {
                    const newId = crypto.randomUUID();
                    chrome.storage.local.set({ gubeUserId: newId }, () => resolve(newId));
                }
            });
        } else {
            resolve('dev-user');
        }
    });
}

async function translateSentence(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
        const userId = await getUserId();
        let finalSource = sourceLang.toUpperCase();
        if (finalSource === 'PT-BR' || finalSource === 'PT-PT') finalSource = 'PT';
        let finalTarget = targetLang.toUpperCase();
        if (finalTarget === 'PT') finalTarget = 'PT-PT';

        const response = await fetch(`${PROXY_BASE}/deepl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ text, source_lang: finalSource, target_lang: finalTarget })
        });

        if (response.status === 429) return 'Daily limit reached. Try again tomorrow.';
        if (!response.ok) throw new Error(`${response.status}`);

        const data = await response.json();
        return data?.translations?.[0]?.text || 'Translation unavailable';
    } catch {
        return 'Error loading translation';
    }
}

export default function Dashboard() {
    const [translations, setTranslations] = useState<TranslationEntry[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [showFullSentence, setShowFullSentence] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [translatedSentence, setTranslatedSentence] = useState<string | null>(null);
    const [sentenceLoading, setSentenceLoading] = useState(false);
    const [darkMode, toggleDarkMode] = useDarkMode();
    // Cache: map of `${context}__${srcLang}_${tgtLang}` -> translated string
    const sentenceCache = useRef<Record<string, string>>({});

    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['savedTranslations'], (result) => {
                const saved = (result.savedTranslations as TranslationEntry[]) || [];
                if (saved.length > 0) {
                    const sorted = [...saved].sort((a, b) => b.timestamp - a.timestamp);
                    setTranslations(sorted);
                }
            });
        } else {
            setTranslations([
                {
                    word: 'mangiare',
                    context: 'Voglio mangiare una mela oggi.',
                    translation: 'to eat',
                    isVerb: true,
                    infinitive: 'mangiare',
                    sourceLang: 'it',
                    targetLang: 'en',
                    timestamp: Date.now()
                },
                {
                    word: 'sempre',
                    context: 'Lui è sempre in ritardo.',
                    translation: 'always',
                    isVerb: false,
                    infinitive: null,
                    sourceLang: 'it',
                    targetLang: 'en',
                    timestamp: Date.now() - 1000
                }
            ]);
        }
    }, []);

    // Keyboard navigation — MUST be before any early returns (Rules of Hooks)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight') {
                setShowAnswer(false);
                setShowFullSentence(false);
                setTranslatedSentence(null);
                setCurrentIndex((prev) => (prev + 1) % Math.max(translations.length, 1));
            } else if (e.key === 'ArrowLeft') {
                setShowAnswer(false);
                setShowFullSentence(false);
                setTranslatedSentence(null);
                setCurrentIndex((prev) => (prev - 1 + Math.max(translations.length, 1)) % Math.max(translations.length, 1));
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setShowAnswer(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [translations.length]);

    const handleShowFullSentence = async () => {
        if (showFullSentence) {
            setShowFullSentence(false);
            return;
        }

        const entry = translations[currentIndex];
        const src = entry.sourceLang || 'it';
        const tgt = entry.targetLang || 'en';
        const cacheKey = `${entry.context}__${src}_${tgt}`;

        if (sentenceCache.current[cacheKey]) {
            setTranslatedSentence(sentenceCache.current[cacheKey]);
            setShowFullSentence(true);
            return;
        }

        setSentenceLoading(true);
        setShowFullSentence(true);
        const result = await translateSentence(entry.context, src, tgt);
        sentenceCache.current[cacheKey] = result;
        setTranslatedSentence(result);
        setSentenceLoading(false);
    };

    const handleClearAll = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove('savedTranslations', () => {
                setTranslations([]);
                setCurrentIndex(0);
                setShowAnswer(false);
                setShowFullSentence(false);
                setTranslatedSentence(null);
                setShowClearConfirm(false);
            });
        } else {
            setTranslations([]);
            setCurrentIndex(0);
            setShowClearConfirm(false);
        }
    };

    // ── Dark mode helpers ──────────────────────────────────────────────────────
    const bg = darkMode ? 'bg-slate-900' : 'bg-slate-50';
    const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
    const cardBorder = darkMode ? 'border-slate-700' : 'border-slate-100';
    const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
    const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
    const footerBg = darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100';
    const kbdClass = darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500';
    const dotActive = darkMode ? 'bg-indigo-400' : 'bg-indigo-500';
    const dotInactive = darkMode ? 'bg-slate-600' : 'bg-slate-300';
    // ──────────────────────────────────────────────────────────────────────────

    if (translations.length === 0) {
        return (
            <div className={`min-h-screen ${bg} flex flex-col font-sans transition-colors duration-200`}>
                <header className={`${darkMode ? 'bg-indigo-800' : 'bg-indigo-600'} text-white p-4 shadow-md transition-colors duration-200`}>
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <h1 className="text-xl font-bold tracking-tight">ConjuMate</h1>
                        <div className="flex items-center gap-3">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleDarkMode}
                                className={`flex items-center justify-center rounded-lg p-2 transition-colors ${darkMode ? 'text-amber-400 hover:bg-indigo-700' : 'text-indigo-200 hover:bg-indigo-500 hover:text-white'}`}
                                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                            <span className="text-indigo-200 text-sm">0 saved</span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className={`${cardBg} p-12 rounded-3xl shadow-lg text-center max-w-md w-full border ${cardBorder} transition-colors duration-200`}>
                        <div className={`w-20 h-20 ${darkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h2 className={`text-2xl font-bold mb-3 ${textPrimary}`}>No translations yet</h2>
                        <p className={`${textMuted} leading-relaxed`}>Highlight words on any webpage to translate them, and they will magically appear here for your practice!</p>
                    </div>
                </div>
            </div>
        );
    }

    const current = translations[currentIndex];

    const nextCard = () => {
        setShowAnswer(false);
        setShowFullSentence(false);
        setTranslatedSentence(null);
        setCurrentIndex((prev) => (prev + 1) % translations.length);
    };

    const prevCard = () => {
        setShowAnswer(false);
        setShowFullSentence(false);
        setTranslatedSentence(null);
        setCurrentIndex((prev) => (prev - 1 + translations.length) % translations.length);
    };

    const getContextWithBlank = (context: string, word: string, isVerb: boolean, infinitive?: string | null) => {
        if (!context || !word) return context;
        try {
            const isFragment = !/[.?!…]\s*$/.test(context.trim());
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            const parts = context.split(regex);
            const mapped = parts.map((part, i) => {
                if (part.toLowerCase() === word.toLowerCase()) {
                    if (showAnswer) {
                        return <span key={i} className={`font-bold border-b-2 px-1 transition-all ${darkMode ? 'text-indigo-400 border-indigo-500' : 'text-indigo-600 border-indigo-200'}`}>{part}</span>;
                    }
                    if (isVerb && infinitive) {
                        return (
                            <span key={i} className={`inline-flex items-center justify-center min-w-[5rem] h-7 italic text-base border-b-2 mx-1 px-2 ${darkMode ? 'text-slate-500 border-slate-600' : 'text-slate-400 border-slate-300'}`}>
                                {infinitive}
                            </span>
                        );
                    }
                    return <span key={i} className={`inline-block w-24 h-6 border-b-2 rounded-sm align-middle mx-1 shadow-inner ${darkMode ? 'bg-slate-700 border-slate-500' : 'bg-slate-200 border-slate-400'}`}></span>;
                }
                return <span key={i}>{part}</span>;
            });
            return isFragment ? [...mapped, <span key="ellipsis" className={darkMode ? 'text-slate-600' : 'text-slate-400'}>…</span>] : mapped;
        } catch {
            return context;
        }
    };

    return (
        <div className={`min-h-screen ${bg} font-sans flex flex-col transition-colors duration-200`}>
            <header className={`${darkMode ? 'bg-indigo-800' : 'bg-indigo-600'} text-white p-4 shadow-md z-10 transition-colors duration-200`}>
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h1 className="text-xl font-bold tracking-tight">ConjuMate</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-700 font-medium px-3 py-1 rounded-full text-indigo-100 text-sm shadow-inner">
                            {translations.length} saved
                        </span>

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className={`flex items-center justify-center rounded-lg p-2 transition-colors ${darkMode ? 'text-amber-400 hover:bg-indigo-700' : 'text-indigo-200 hover:bg-indigo-500 hover:text-white'}`}
                            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {!showClearConfirm ? (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center gap-1.5 text-indigo-200 hover:text-white hover:bg-indigo-500 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear all
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-lg text-sm">
                                <span className="text-white font-medium">Confirm?</span>
                                <button onClick={handleClearAll} className="text-white font-bold hover:underline">Yes</button>
                                <span className="text-red-200">/</span>
                                <button onClick={() => setShowClearConfirm(false)} className="text-red-100 hover:underline">No</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 mt-4 sm:mt-8 flex flex-col items-center flex-1">
                <div className={`w-full max-w-2xl ${cardBg} rounded-3xl shadow-xl overflow-hidden border ${cardBorder} flex flex-col transition-colors duration-200`}>

                    {/* Card Body */}
                    <div className={`p-8 sm:p-12 text-center flex flex-col justify-center items-center relative ${darkMode ? 'bg-slate-800' : 'bg-white'}`} style={{ minHeight: '320px' }}>
                        <div className={`absolute top-6 left-6 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                            <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                        </div>

                        {/* Label */}
                        <div className="mb-6 z-10 w-full flex items-center justify-center gap-2">
                            <span className={`text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full border ${darkMode ? 'text-indigo-400 bg-indigo-900/40 border-indigo-800' : 'text-indigo-500 bg-indigo-50 border-indigo-100'}`}>
                                Fill in the blank
                            </span>
                            {current.isVerb && (
                                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border tracking-wide ${darkMode ? 'text-violet-400 bg-violet-900/40 border-violet-800' : 'text-violet-500 bg-violet-50 border-violet-100'}`}>
                                    Verb
                                </span>
                            )}
                        </div>

                        {/* Sentence with blank */}
                        <p className={`text-2xl sm:text-3xl font-medium leading-relaxed mb-4 z-10 max-w-lg ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {getContextWithBlank(current.context, current.word, !!current.isVerb, current.infinitive)}
                        </p>

                        {/* Show full sentence (translated) */}
                        {!showAnswer && (
                            <button
                                onClick={handleShowFullSentence}
                                disabled={sentenceLoading}
                                className={`text-xs underline underline-offset-2 transition-colors mb-3 disabled:opacity-50 ${darkMode ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500'}`}
                            >
                                {sentenceLoading
                                    ? 'Translating…'
                                    : showFullSentence
                                        ? 'Hide translated sentence'
                                        : 'Show full sentence (translated)'}
                            </button>
                        )}

                        {showFullSentence && !showAnswer && (
                            <div className={`mb-4 text-base rounded-xl px-5 py-3 max-w-lg text-left leading-relaxed border ${darkMode ? 'text-slate-300 bg-slate-700/50 border-slate-600' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                                <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Translated sentence</span>
                                {sentenceLoading
                                    ? <span className={`italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading…</span>
                                    : translatedSentence}
                            </div>
                        )}

                        {/* Translation answer reveal */}
                        <div className={`transition-all duration-300 transform ${showAnswer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute bottom-10'}`}>
                            <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Translation</div>
                            <div className={`text-3xl font-bold px-6 py-2 rounded-2xl inline-block border ${darkMode ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-emerald-500 bg-emerald-50 border-emerald-100'}`}>
                                {current.translation}
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className={`${footerBg} border-t p-6 flex justify-between items-center px-8 transition-colors duration-200`}>
                        <button
                            onClick={prevCard}
                            className={`group flex items-center gap-2 px-4 py-2 transition-colors font-medium rounded-xl ${darkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 active:bg-slate-200'}`}
                        >
                            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <span className="hidden sm:inline">Prev</span>
                        </button>

                        <button
                            onClick={() => { setShowAnswer(a => !a); setShowFullSentence(false); setTranslatedSentence(null); }}
                            className={`px-8 py-3.5 rounded-2xl font-bold shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${showAnswer
                                ? darkMode
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30'
                                }`}
                        >
                            {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
                        </button>

                        <button
                            onClick={nextCard}
                            className={`group flex items-center gap-2 px-4 py-2 transition-colors font-medium rounded-xl ${darkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 active:bg-slate-200'}`}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Progress dots and hint */}
                <div className="mt-8 flex flex-col items-center">
                    <div className="flex gap-1.5 mb-4 max-w-xs flex-wrap justify-center">
                        {translations.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? `w-8 ${dotActive}` : `w-2 ${dotInactive}`}`}
                            />
                        ))}
                    </div>
                    <div className={`text-sm font-medium ${textMuted}`}>
                        Card {currentIndex + 1} of {translations.length}
                    </div>
                    <div className={`text-xs mt-3 flex items-center gap-4 opacity-70 ${textMuted}`}>
                        <span><kbd className={`font-mono px-1 rounded ${kbdClass}`}>space</kbd> to flip</span>
                        <span><kbd className={`font-mono px-1 rounded ${kbdClass}`}>←</kbd> <kbd className={`font-mono px-1 rounded ${kbdClass}`}>→</kbd> to navigate</span>
                    </div>
                </div>
            </main>
        </div>
    );
};
