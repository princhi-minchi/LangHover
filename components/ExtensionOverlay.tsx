import React, { useEffect, useState } from 'react';
import { translateText } from '../services/translationService';
import { fetchConjugations, fetchDefinitions } from '../services/ultralinguaService';
import { adaptConjugationsToVerbEntry } from '../utils/apiAdapters';
import { VerbEntry, UltralinguaDefinitionItem } from '../types';
import TranslationCard from './TranslationCard';
import DefinitionCard from './DefinitionCard';
import PhraseOverlay from './PhraseOverlay';
import { ALL_TENSES } from '../utils/tenseMapping';

export default function ExtensionOverlay() {
  const [selection, setSelection] = useState<{
    word: string;
    entry?: VerbEntry;
    definitions?: UltralinguaDefinitionItem[];
    style: React.CSSProperties;
    translation?: string | null;
    infinitiveTranslation?: string | null;
    isPhrase?: boolean;
    highlightedWords?: string[];
    enabledTenses?: string[];
    initialTense?: string;
  } | null>(null);

  // Define settings fetching
  const getSettings = async () => {
    let target = 'en';
    let tenses = ALL_TENSES;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await new Promise<{ targetLang?: string; enabledTenses?: string[] }>(resolve =>
        chrome.storage.local.get(['targetLang', 'enabledTenses'], (items) => resolve(items as { targetLang?: string; enabledTenses?: string[] }))
      );
      if (result.targetLang) target = result.targetLang;
      if (result.enabledTenses) tenses = result.enabledTenses;
    } else {
      const savedLang = localStorage.getItem('targetLang');
      const savedTenses = localStorage.getItem('enabledTenses');
      if (savedLang) target = savedLang;
      if (savedTenses) tenses = JSON.parse(savedTenses);
    }
    return { targetLang: target, enabledTenses: tenses };
  };

  useEffect(() => {
    const handleGlobalSelection = async () => {
      const selectionObj = window.getSelection();
      if (!selectionObj || selectionObj.rangeCount === 0 || selectionObj.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = selectionObj.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      // Check if it's a phrase (more than one word)
      const isPhrase = text.includes(' ');

      // Determine clean text for verb lookup
      const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");

      // Get Coordinates
      const range = selectionObj.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const CARD_WIDTH = 320;
      const CARD_HEIGHT = isPhrase ? 100 : 300;
      const GAP = 12;

      let left = rect.left + (rect.width / 2) - (CARD_WIDTH / 2);
      left = Math.max(16, Math.min(left, viewportWidth - CARD_WIDTH - 16));

      const spaceBelow = viewportHeight - rect.bottom;
      let style: React.CSSProperties = { left };

      if (spaceBelow < (CARD_HEIGHT + GAP) && rect.top > (CARD_HEIGHT + GAP)) {
        style.bottom = viewportHeight - rect.top + GAP;
      } else {
        style.top = rect.bottom + GAP;
      }

      // If same selection, update pos only
      if (selection && selection.word === text) {
        setSelection(prev => prev ? ({ ...prev, style }) : null);
        return;
      }

      // Initial State
      setSelection({
        word: text,
        style,
        translation: null,
        isPhrase,
        infinitiveTranslation: null
      });

      // Fetch Data
      try {
        const { targetLang, enabledTenses } = await getSettings();
        let translatedText: string | null = null;
        let infinitiveTranslatedText: string | null = null;
        let entry: VerbEntry | undefined;
        let definitions: UltralinguaDefinitionItem[] | undefined;
        let initialTense: string | undefined;

        if (!isPhrase) {
          // 1. Try verb lookup first
          const sourceLang = 'italian'; // Assuming source is Italian for now as per context
          console.log('Fetching conjugations for:', cleanText);
          const conjugationResults = await fetchConjugations(cleanText, sourceLang);
          console.log('Conjugation results:', conjugationResults);

          if (conjugationResults && conjugationResults.length > 0) {
            // It is a verb!
            const bestMatch = conjugationResults[0];
            entry = adaptConjugationsToVerbEntry(bestMatch.infinitive, 'Definition unavailable', bestMatch.conjugations);

            // Identify tense
            for (const [tenseName, conjugationSet] of Object.entries(entry.tenses)) {
              if (Object.values(conjugationSet).some(val => val.toLowerCase() === cleanText)) {
                initialTense = tenseName;
                break;
              }
            }

            // 2. Fetch BOTH translations
            // a. Translation of SELECTED VERB
            const p1 = translateText(text, targetLang);
            // b. Translation of INFINITIVE
            const p2 = translateText(bestMatch.infinitive, targetLang);

            const [t1, t2] = await Promise.all([p1, p2]);
            translatedText = t1;
            infinitiveTranslatedText = t2;

          } else {
            // Not a verb (or no conjugations found)
            console.log('No conjugations found, checking definitions...');

            // 1b. Try definitions lookup
            const defs = await fetchDefinitions(cleanText, sourceLang, targetLang);

            if (defs && defs.length > 0) {
              definitions = defs;
            } else {
              // 1c. If no definitions either, just translate original text
              console.log('No definitions found, falling back to translation');
              translatedText = await translateText(text, targetLang);
            }
          }
        } else {
          // It is a phrase
          // 2c. Translate the PHRASE
          translatedText = await translateText(text, targetLang);
        }

        setSelection(prev => {
          if (prev && prev.word === text) {
            return {
              ...prev,
              translation: translatedText,
              infinitiveTranslation: infinitiveTranslatedText,
              entry: entry,
              definitions: definitions,
              highlightedWords: [], // removed phrase highlighting for now
              enabledTenses,
              initialTense
            };
          }
          return prev;
        });

      } catch (e) {
        console.error(e);
        setSelection(prev => {
          if (prev && prev.word === text) return { ...prev, translation: 'Error' };
          return prev;
        });
      }
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [selection]); // Removed verbData dep

  if (!selection) return null;

  if (selection.isPhrase) {
    return (
      <PhraseOverlay
        originalText={selection.word}
        translation={selection.translation || null}
        highlightedWords={selection.highlightedWords}
        style={selection.style}
      />
    );
  }

  // Only show TranslationCard if we have a valid VerbEntry
  if (selection.entry) {
    return (
      <TranslationCard
        word={selection.word}
        entry={selection.entry}
        style={selection.style}
        translation={selection.translation}
        infinitiveTranslation={selection.infinitiveTranslation}
        enabledTenses={selection.enabledTenses}
        initialTense={selection.initialTense}
      />
    );
  }

  // Show DefinitionCard if we have definitions
  if (selection.definitions) {
    return (
      <DefinitionCard
        word={selection.word}
        definitions={selection.definitions}
        style={selection.style}
      />
    );
  }

  // If we have just a translation (no verb, no definitions, but maybe failed fallback?)
  // Currently we only show PhraseOverlay for phrases.
  // If it's a single word and we got a translation but no definitions, do we show PhraseOverlay?
  // The logic above sets isPhrase = false.
  // If we want to show simple translation for single words that are not found in dictionary:
  // We can repurpose PhraseOverlay or create a simple one.
  // For now, adhering to instruction: if no response (verb or def), do what it currently does (which was nothing/translation).
  // If we want to show translation for single words:
  if (selection.translation && !selection.entry && !selection.definitions) {
    // Optional: Render PhraseOverlay even for single words if nothing else found?
    // Users usually expect *something*.
    // Let's render PhraseOverlay as a fallback for single words too if we have a translation.
    return (
      <PhraseOverlay
        originalText={selection.word}
        translation={selection.translation}
        highlightedWords={[]}
        style={selection.style}
      />
    );
  }

  return null;
}
