import React, { useEffect, useState } from 'react';
import { parseCSV } from '../utils/csvParser';
import { fetchVerbData } from '../services/csvData'; // New import
import { VerbEntry } from '../types';
import TranslationCard from './TranslationCard';

export default function ExtensionOverlay() {
  const [verbData, setVerbData] = useState<Record<string, VerbEntry>>({});
  const [selection, setSelection] = useState<{
    word: string;
    entry: VerbEntry;
    style: React.CSSProperties;
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
    const handleGlobalSelection = () => {
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
        
        setSelection({ word: text, entry, style });
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
  }, [verbData]);

  if (!selection) return null;

  return (
    <TranslationCard 
      word={selection.word} 
      entry={selection.entry} 
      style={selection.style} 
    />
  );
}