import React, { useEffect, useState } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, getAllLanguages } from '../utils/languageConfig';

const LANGUAGES = getAllLanguages().map((lang) => ({
    code: lang.code,
    name: lang.displayName,
    isSupported: lang.isSupported
}));

export default function Settings() {
    const [sourceLang, setSourceLang] = useState(DEFAULT_SOURCE_LANGUAGE);
    const [targetLang, setTargetLang] = useState(DEFAULT_TARGET_LANGUAGE);
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Load saved settings
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['sourceLanguage', 'targetLanguage', 'sourceLang', 'targetLang'], (result) => {
                // Use new keys if available, fallback to old keys for migration
                const sLang = result.sourceLanguage || result.sourceLang;
                const tLang = result.targetLanguage || result.targetLang;
                
                if (sLang) setSourceLang(sLang);
                if (tLang) setTargetLang(tLang);
            });
        } else {
            // Fallback for dev mode
            const savedSourceLang = localStorage.getItem('sourceLanguage') || localStorage.getItem('sourceLang');
            const savedTargetLang = localStorage.getItem('targetLanguage') || localStorage.getItem('targetLang');
            if (savedSourceLang) setSourceLang(savedSourceLang);
            if (savedTargetLang) setTargetLang(savedTargetLang);
        }
    }, []);

    const handleSave = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ 
                sourceLanguage: sourceLang, 
                targetLanguage: targetLang,
                // Also set old keys once for backward compatibility during transitions
                sourceLang: sourceLang,
                targetLang: targetLang
            }, () => {
                setStatus('Options saved.');
                setTimeout(() => setStatus(''), 2000);
            });
        } else {
            // Fallback for dev mode
            localStorage.setItem('sourceLanguage', sourceLang);
            localStorage.setItem('targetLanguage', targetLang);
            setStatus('Options saved (Dev Mode).');
            setTimeout(() => setStatus(''), 2000);
        }
    };

    return (
        <div className="p-4 w-96 bg-white max-h-[600px] overflow-y-auto">
            <h1 className="text-xl font-bold mb-4 text-slate-800">Language Settings</h1>

            <div className="mb-6">
                <label htmlFor="sourceLanguage" className="block text-sm font-medium text-slate-700 mb-1">
                    Source Language
                </label>
                <select
                    id="sourceLanguage"
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                    {LANGUAGES.map((lang) => (
                        <option 
                            key={lang.code} 
                            value={lang.code}
                            disabled={!lang.isSupported}
                        >
                            {lang.name} {!lang.isSupported && '(Coming Soon)'}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                    Select the language of the text you're selecting.
                </p>
            </div>

            <div className="mb-6">
                <label htmlFor="targetLanguage" className="block text-sm font-medium text-slate-700 mb-1">
                    Target Language
                </label>
                <select
                    id="targetLanguage"
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                    Select the language you want translations in.
                </p>
            </div>

            <button
                onClick={handleSave}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
                Save
            </button>

            {status && (
                <div className="mt-3 text-sm text-green-600 font-medium text-center">
                    {status}
                </div>
            )}
        </div>
    );
}
