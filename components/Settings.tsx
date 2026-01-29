import React, { useEffect, useState } from 'react';

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
];

export default function Settings() {
    const [targetLang, setTargetLang] = useState('en');
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Load saved setting
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['targetLang'], (result) => {
                if (result.targetLang) {
                    setTargetLang(result.targetLang);
                }
            });
        } else {
            // Fallback for dev mode
            const saved = localStorage.getItem('targetLang');
            if (saved) setTargetLang(saved);
        }
    }, []);

    const handleSave = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ targetLang }, () => {
                setStatus('Options saved.');
                setTimeout(() => setStatus(''), 2000);
            });
        } else {
            // Fallback for dev mode
            localStorage.setItem('targetLang', targetLang);
            setStatus('Options saved (Dev Mode).');
            setTimeout(() => setStatus(''), 2000);
        }
    };

    return (
        <div className="p-4 w-80 bg-white">
            <h1 className="text-xl font-bold mb-4 text-slate-800">Italian Verb Settings</h1>

            <div className="mb-4">
                <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">
                    Target Language
                </label>
                <select
                    id="language"
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
