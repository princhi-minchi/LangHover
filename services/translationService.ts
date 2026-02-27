const BASE_URL = 'https://gube-proxy.raunaksbs.workers.dev/api';

// Helper: Generates or retrieves a unique User ID from Chrome Storage securely
const getUserId = async (): Promise<string> => {
    return new Promise((resolve) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['gubeUserId'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Chrome storage get failed (context may be invalidated):', chrome.runtime.lastError);
                        resolve(crypto.randomUUID());
                        return;
                    }
                    if (result && result.gubeUserId) {
                        resolve(result.gubeUserId as string);
                    } else {
                        const newId = crypto.randomUUID();
                        chrome.storage.local.set({ gubeUserId: newId }, () => {
                            if (chrome.runtime.lastError) {
                                console.warn('Chrome storage set failed:', chrome.runtime.lastError);
                            }
                            resolve(newId);
                        });
                    }
                });
            } else {
                resolve(crypto.randomUUID());
            }
        } catch (e) {
            console.warn('Chrome storage threw an error (extension updated/reloaded?):', e);
            resolve(crypto.randomUUID());
        }
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

export interface DeepLTranslationResponse {
    translations: {
        detected_source_language: string;
        text: string;
    }[];
}

export const translateWithDeepL = async (text: string, sourceLang: string, targetLang: string = 'en', context?: string): Promise<string> => {
    try {
        const userId = await getUserId();
        // DeepL expects upper case codes for some target languages like EN-US/EN-GB, but works with EN 
        // We will just use the provided code.
        let finalSource = sourceLang.toUpperCase();
        if (finalSource === 'PT-BR' || finalSource === 'PT-PT') {
            finalSource = 'PT';
        }

        let finalTarget = targetLang.toUpperCase();
        if (finalTarget === 'PT') {
            finalTarget = 'PT-PT';
        }

        const requestBody: any = {
            text: text,
            source_lang: finalSource,
            target_lang: finalTarget
        };

        if (context) {
            requestBody.context = context;
        }

        const response = await fetch(`${BASE_URL}/deepl`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify(requestBody)
        });

        if (response.status === 429) {
            return 'Free daily limit reached! Come back tomorrow.';
        }

        if (!response.ok) {
            throw new Error(`DeepL Translation failed: ${response.statusText}`);
        }

        const data: DeepLTranslationResponse = await response.json();

        if (data && data.translations && data.translations.length > 0) {
            return data.translations[0].text;
        } else {
            throw new Error('No translation found in DeepL response');
        }

    } catch (error) {
        console.error('Error in translateWithDeepL:', error);
        return 'Error loading translation';
    }
};