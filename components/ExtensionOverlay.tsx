import React, { useEffect, useState } from 'react';
import { parseCSV } from '../utils/csvParser';
import { fetchVerbData } from '../services/csvData';
import { translateText } from '../services/translationService';
import { VerbEntry } from '../types';
import TranslationCard from './TranslationCard';

export default function ExtensionOverlay() {
  const [verbData, setVerbData] = useState<Record<string, VerbEntry>>({});
  const [selection, setSelection] = useState<{
    word: string;
    entry: VerbEntry;
    style: React.CSSProperties;
    translation?: string | null;
  } | null>(null);

  // 1. Load Data Async
  useEffect(() => {
    const load = async () => {
      const text = await fetchVerbData();
      const data = parseCSV(text);
      setVerbData(data);
    };
    load();
  }, []);

  // ... (keep the rest of your useEffect for handleGlobalSelection exactly as it was)
  // ... (ensure you define handleGlobalSelection and attach listeners like before)

  // NOTE: You must include the handleGlobalSelection logic here. 
  // I am omitting it for brevity, but copy it from your previous file.
  // The only change is that 'verbData' is now populated asynchronously.

  // ... rest of component

  // Quick re-paste of listener logic for safety:
  useEffect(() => {
    const handleGlobalSelection = async () => {
      const selectionObj = window.getSelection();
      if (!selectionObj || selectionObj.rangeCount === 0 || selectionObj.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = selectionObj.toString().trim();
      if (!text || text.includes(' ')) {
        setSelection(null);
        return;
      }
      const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");
      const entry = verbData[cleanText];

      if (entry) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // ... (Your positioning logic) ...
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const CARD_WIDTH = 320;
        const CARD_HEIGHT = 300;
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



        // CHECK: If word matches current selection, update position only and preserve translation.
        if (selection && selection.word === text) {
          setSelection(prev => prev ? ({ ...prev, style, entry }) : null);
          return;
        }

        // 1. Set initial state (loading)
        setSelection({ word: text, entry, style, translation: null });

        // 2. Fetch translation
        try {
          const translated = await translateText(text, 'en');
          // Update state only if user hasn't selected something else in the meantime
          // A simple way is to check if selection is still the same word, 
          // but for now we will just update the state.
          // React state updates are functional, so we can ensure we are updating the right thing.
          setSelection(prev => {
            if (prev && prev.word === text) {
              return { ...prev, translation: translated };
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

  return (
    <TranslationCard
      word={selection.word}
      entry={selection.entry}
      style={selection.style}
      translation={selection.translation}
    />
  );
}