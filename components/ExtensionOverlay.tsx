import React, { useEffect, useState } from 'react';
import { parseCSV } from '../utils/csvParser';
import { fetchVerbData } from '../services/csvData';
import { translateText } from '../services/translationService';
import { VerbEntry } from '../types';
import TranslationCard from './TranslationCard';
import PhraseOverlay from './PhraseOverlay';

import nlp from 'compromise';

export default function ExtensionOverlay() {
  const [verbData, setVerbData] = useState<Record<string, VerbEntry>>({});
  const [selection, setSelection] = useState<{
    word: string;
    entry?: VerbEntry;
    style: React.CSSProperties;
    translation?: string | null;
    isPhrase?: boolean;
    highlightedWords?: string[];
  } | null>(null);

  // 1. Load Data Async & Settings
  useEffect(() => {
    const load = async () => {
      // Load verb data
      const text = await fetchVerbData();
      const data = parseCSV(text);
      setVerbData(data);
    };
    load();
  }, []);

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

      let entry: VerbEntry | undefined;

      // Only look for verb entry if it is NOT a phrase (single word)
      if (!isPhrase) {
        entry = verbData[cleanText];
      }

      // If it's a phrase OR a recognized verb
      if (isPhrase || entry) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const CARD_WIDTH = 320;
        const CARD_HEIGHT = isPhrase ? 100 : 300; // Smaller height for phrase overlay approx
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

        // CHECK: If content matches current selection, update position only and protect translation state
        if (selection && selection.word === text) {
          setSelection(prev => prev ? ({ ...prev, style, entry, isPhrase }) : null);
          return;
        }

        // 1. Set initial state (loading)
        setSelection({
          word: text,
          entry,
          style,
          translation: null,
          isPhrase
        });

        // 2. Fetch translation
        try {
          // Get target language
          let target = 'en';
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await new Promise<{ targetLang?: string }>(resolve =>
              chrome.storage.local.get(['targetLang'], (items) => resolve(items as { targetLang?: string }))
            );
            if (result.targetLang) target = result.targetLang;
          } else {
            const saved = localStorage.getItem('targetLang');
            if (saved) target = saved;
          }

          const translated = await translateText(text, target);

          // VERB DETECTION LOGIC
          let highlighted: string[] = [];
          if (isPhrase && verbData) {
            // Check if source text contains any verb from our database
            // We split by standard delimiters to find independent words
            const words = text.toLowerCase().split(/[\s.,;!?]+/);
            const hasSourceVerb = words.some(w => Object.prototype.hasOwnProperty.call(verbData, w));

            if (hasSourceVerb) {
              // Use compromise to find verbs in the English translation
              const doc = nlp(translated);
              highlighted = doc.verbs().out('array');
              console.log('Source verb detected. Highlighted English verbs:', highlighted);
            }
          }

          setSelection(prev => {
            if (prev && prev.word === text) {
              return { ...prev, translation: translated, highlightedWords: highlighted };
            }
            return prev;
          });
        } catch (e) {
          console.error(e);
          setSelection(prev => {
            if (prev && prev.word === text) {
              return { ...prev, translation: 'Error' };
            }
            return prev;
          });
        }
      } else {
        // Not a phrase and not a known verb
        setSelection(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [verbData, selection]);

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

  // Must be a verb entry if we got here and !isPhrase, but strictly verify
  if (selection.entry) {
    return (
      <TranslationCard
        word={selection.word}
        entry={selection.entry}
        style={selection.style}
        translation={selection.translation}
      />
    );
  }

  return null;
}
