import React, { useEffect, useState } from 'react';
import { ALL_TENSES, TENSE_DISPLAY_NAMES } from '../utils/tenseMapping';
import { SUPPORTED_LANGUAGES } from '../utils/languageMapping';

const LANGUAGES = Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
    code: code,
    name: lang.displayName
}));

export default function Settings() {
    const [targetLang, setTargetLang] = useState('en');
    const [enabledTenses, setEnabledTenses] = useState<string[]>(ALL_TENSES);
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Load saved setting
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['targetLang', 'enabledTenses'], (result) => {
                if (result.targetLang) {
                    setTargetLang(result.targetLang);
                }
                if (result.enabledTenses) {
                    setEnabledTenses(result.enabledTenses);
                }
            });
        } else {
            // Fallback for dev mode
            const savedLang = localStorage.getItem('targetLang');
            const savedTenses = localStorage.getItem('enabledTenses');
            if (savedLang) setTargetLang(savedLang);
            if (savedTenses) setEnabledTenses(JSON.parse(savedTenses));
        }
    }, []);

    const handleSave = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ targetLang, enabledTenses }, () => {
                setStatus('Options saved.');
                setTimeout(() => setStatus(''), 2000);
            });
        } else {
            // Fallback for dev mode
            localStorage.setItem('targetLang', targetLang);
            localStorage.setItem('enabledTenses', JSON.stringify(enabledTenses));
            setStatus('Options saved (Dev Mode).');
            setTimeout(() => setStatus(''), 2000);
        }
    };

    const toggleTense = (tense: string) => {
        setEnabledTenses(prev =>
            prev.includes(tense)
                ? prev.filter(t => t !== tense)
                : [...prev, tense]
        );
    };

    const toggleAll = () => {
        if (enabledTenses.length === ALL_TENSES.length) {
            setEnabledTenses([]);
        } else {
            setEnabledTenses(ALL_TENSES);
        }
    };

    return (
        <div className="p-4 w-96 bg-white max-h-[600px] overflow-y-auto">
            <h1 className="text-xl font-bold mb-4 text-slate-800">Italian Verb Settings</h1>

            <div className="mb-6">
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

            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                        Visible Tenses
                    </label>
                    <button
                        onClick={toggleAll}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                        {enabledTenses.length === ALL_TENSES.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                <div className="space-y-2 border rounded-md p-3 bg-slate-50 max-h-60 overflow-y-auto">
                    {ALL_TENSES.map((tense) => (
                        <div key={tense} className="flex items-center">
                            <input
                                id={`tense-${tense}`}
                                type="checkbox"
                                checked={enabledTenses.includes(tense)}
                                onChange={() => toggleTense(tense)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`tense-${tense}`} className="ml-2 block text-sm text-slate-900">
                                {TENSE_DISPLAY_NAMES[tense] || tense}
                            </label>
                        </div>
                    ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                    Unchecked tenses will be hidden, unless they match the selected verb.
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
