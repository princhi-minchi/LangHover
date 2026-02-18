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

export interface TranslationResponse {
    data: {
        translations: {
            translatedText: string;
            detectedSourceLanguage: string;
        }[];
    };
}

export const translateText = async (text: string, targetLang: string = 'en'): Promise<string> => {
    try {
        const userId = await getUserId();

        const response = await fetch(`${BASE_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId // Sending the ID to our rate limiter!
            },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'text'
            })
        });

        // Handle our new Rate Limiter gracefully
        if (response.status === 429) {
            return 'Free daily limit reached! Come back tomorrow.';
        }

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data: TranslationResponse = await response.json();

        if (data.data && data.data.translations && data.data.translations.length > 0) {
            return data.data.translations[0].translatedText;
        } else {
            throw new Error('No translation found in response');
        }

    } catch (error) {
        console.error('Error in translateText:', error);
        return 'Error loading translation';
    }
};