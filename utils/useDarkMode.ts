import { useState, useEffect } from 'react';

const STORAGE_KEY = 'darkMode';

function readDarkMode(): boolean {
    try {
        const val = localStorage.getItem(STORAGE_KEY);
        return val === 'true';
    } catch {
        return false;
    }
}

function persistDarkMode(value: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(value));
    } catch { /* ignore */ }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
            chrome.storage.local.set({ [STORAGE_KEY]: value });
        } catch { /* ignore */ }
    }
}

export function useDarkMode(): [boolean, () => void] {
    const [darkMode, setDarkMode] = useState<boolean>(() => readDarkMode());

    // Sync from chrome.storage on mount (extension context)
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                if (typeof result[STORAGE_KEY] === 'boolean') {
                    setDarkMode(result[STORAGE_KEY]);
                }
            });
        }
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const next = !prev;
            persistDarkMode(next);
            return next;
        });
    };

    return [darkMode, toggleDarkMode];
}
