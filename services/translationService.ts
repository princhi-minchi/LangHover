
const API_KEY = 'AIzaSyAdaRZPE_d-ZRDuESraHRMwtmgF-Wti56s';
const BASE_URL = 'https://translation.googleapis.com/language/translate/v2';

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
        const url = `${BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(text)}&target=${targetLang}`;

        // Google API requires POST for larger queries, but GET works for single words/short phrases.
        // We'll use POST to be safe and standard.
        const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'text'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Translation API Error:', errorData);
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
