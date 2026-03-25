import { ConjugationLookupResponse } from '../types';
import { getApiUrl } from '../utils/apiConfig';

// Use centralized API configuration
const LOOKUP_URL = getApiUrl('/api/italian/conjugation-lookup');

export const fetchItalianConjugation = async (
  text: string
): Promise<ConjugationLookupResponse | null> => {
  try {
    const response = await fetch(LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ selection: text })
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Error fetching Italian conjugation: ${response.statusText}`);
      }
      return null;
    }

    const data: ConjugationLookupResponse = await response.json();
    return data?.entry ? data : null;
  } catch (error) {
    console.error('Failed to fetch Italian conjugation:', error);
    return null;
  }
};
