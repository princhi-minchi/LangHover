import { UltralinguaConjugation, UltralinguaDefinitionItem, UltralinguaResponseItem } from '../types';

const BASE_URL = 'https://gube-proxy.raunaksbs.workers.dev/api';

// Helper: Generates or retrieves a unique User ID from Chrome Storage
const getUserId = async (): Promise<string> => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['gubeUserId'], (result) => {
            if (result.gubeUserId) {
                resolve(result.gubeUserId as string);
            } else {
                const newId = crypto.randomUUID();
                chrome.storage.local.set({ gubeUserId: newId }, () => resolve(newId));
            }
        });
    });
};

export const fetchDefinitions = async (
    word: string,
    sourceLang: string,
    targetLang: string
): Promise<UltralinguaDefinitionItem[] | null> => {
    try {
        const userId = await getUserId();
        const url = `${BASE_URL}/definitions/${sourceLang}/${targetLang}/${encodeURIComponent(word)}`;

        const response = await fetch(url, {
            headers: { 'x-user-id': userId } // Send ID to rate limiter
        });

        // Handle Rate Limit
        if (response.status === 429) {
            console.warn('Gube: Daily dictionary limit reached.');
            return null;
        }

        if (!response.ok) {
            console.error(`Error fetching definitions: ${response.statusText}`);
            return null;
        }

        const data: UltralinguaDefinitionItem[] = await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to fetch definitions:', error);
        return null;
    }
};

export const fetchConjugations = async (
    word: string,
    sourceLang: string
): Promise<UltralinguaResponseItem[]> => {
    try {
        const userId = await getUserId();
        const url = `${BASE_URL}/conjugations/${sourceLang}/${encodeURIComponent(word)}`;

        const response = await fetch(url, {
            headers: { 'x-user-id': userId } // Send ID to rate limiter
        });

        if (response.status === 429) {
            console.warn('Gube: Daily dictionary limit reached.');
            return [];
        }

        if (!response.ok) {
            if (response.status !== 404) {
                console.error(`Error fetching conjugations: ${response.statusText}`);
            }
            return [];
        }

        const data: UltralinguaResponseItem[] = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch conjugations:', error);
        return [];
    }
};