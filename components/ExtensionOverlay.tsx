import React, { useEffect, useState } from 'react';
import { translateText } from '../services/translationService';
import { fetchConjugations } from '../services/ultralinguaService';
import { adaptConjugationsToVerbEntry } from '../utils/apiAdapters';
import { VerbEntry } from '../types';
import TranslationCard from './TranslationCard';
import PhraseOverlay from './PhraseOverlay';
import { ALL_TENSES } from '../utils/tenseMapping';

export default function ExtensionOverlay() {
  const [selection, setSelection] = useState<{
    word: string;
    entry?: VerbEntry;
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
        let initialTense: string | undefined;

        if (!isPhrase) {
          // 1. Try verb lookup first
          const sourceLang = 'italian';
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
            // Not a verb
            console.log('No conjugations found, assuming not a verb');
            // 2b. Translate the ORIGINAL TEXT
            translatedText = await translateText(text, targetLang);
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
              entry: entry, // will be undefined if not a verb
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

  // If not a phrase and not a verb, currently we show nothing or maybe just translation?
  // The original code: "if (!isPhrase && !entry) setSelection(null)" imply we don't show anything.
  // BUT: We setSelection BEFORE we know if it is a verb.
  // So if it turns out NOT to be a verb, we should probably close it or show just translation?
  // The original code logic:
  // "Only look for verb entry if NOT a phrase... If it's a phrase OR entry... setSelection"
  // So if it was a single word and NOT in CSV, it did NOTHING.
  // So we should replicate that: if single word and NOT verb, we hide it.

  // However, since we act async, we initially show it.
  // If we want to strictly mimic: we shouldn't show unitl we know. 
  // But that delays UI. 
  // Let's hide it if translation arrives and no entry and not phrase.

  // Ideally, we'd render a simple translation card for non-verbs too? 
  // User didn't ask for that, so let's stick to "If not phrase and not verb -> null".

  // Logic inside Effect:
  // "if (!isPhrase) check verb... if (defResult.isVerb)..."
  // If we reach end of effect and entry is still undefined and !isPhrase, 
  // the component will render generic info or nothing?
  // Current return logic: if (selection.entry) render Card. Else return null.
  // So initially it returns null (loading?). 
  // We might want to show a loading state. 
  // But original app didn't show loading for non-verbs, it checked sync against CSV.
  // Now we are async. Optimistic UI is better.
  // But for now, if we return null, user sees nothing until data loads?
  // If we want to avoid flashing, we can keep it null.

  return null;
}
