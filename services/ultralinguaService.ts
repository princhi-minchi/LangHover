import { UltralinguaConjugation, UltralinguaDefinitionItem, UltralinguaResponseItem } from '../types';

const BASE_URL = 'https://api.ultralingua.com/api/2.0';
const API_KEY = 'YTX7T94MM92LKZPN64W3P';

export const fetchDefinitions = async (
    word: string,
    sourceLang: string,
    targetLang: string
): Promise<UltralinguaDefinitionItem[] | null> => {
    try {
        const url = `${BASE_URL}/definitions/${sourceLang}/${targetLang}/${encodeURIComponent(word)}?key=${API_KEY}`;
        const response = await fetch(url);

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
        const url = `${BASE_URL}/conjugations/${sourceLang}/${encodeURIComponent(word)}?key=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            // 404 might mean no conjugations found (e.g. not a verb or not found)
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
