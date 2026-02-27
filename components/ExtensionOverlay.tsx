import React, { useEffect, useState, useRef } from 'react';
import { translateText, translateWithDeepL } from '../services/translationService';
import { fetchConjugations } from '../services/ultralinguaService';
import { adaptConjugationsToVerbEntry } from '../utils/apiAdapters';
import { VerbEntry } from '../types';
import TranslationCard from './TranslationCard';
import DefinitionCard from './DefinitionCard';
import PhraseOverlay from './PhraseOverlay';
import { ALL_TENSES } from '../utils/tenseMapping';
import { SUPPORTED_LANGUAGES, DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from '../utils/languageMapping';

export default function ExtensionOverlay() {
  const [selection, setSelection] = useState<{
    word: string;
    contextText?: string;
    entry?: VerbEntry;
    style: React.CSSProperties;
    translation?: string | null;
    isPhrase?: boolean;
    highlightedWords?: string[];
    enabledTenses?: string[];
    initialTense?: string;
  } | null>(null);

  const [sourceLang, setSourceLang] = useState<string>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<string>(DEFAULT_TARGET_LANG);
  const [enabledTenses, setEnabledTenses] = useState<string[]>(ALL_TENSES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Define settings fetching
  const getSettings = async () => {
    let source = DEFAULT_SOURCE_LANG;
    let target = DEFAULT_TARGET_LANG;
    let tenses = ALL_TENSES;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const result = await new Promise<{ sourceLang?: string; targetLang?: string; enabledTenses?: string[] }>((resolve, reject) => {
          chrome.storage.local.get(['sourceLang', 'targetLang', 'enabledTenses'], (items) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            resolve(items as { sourceLang?: string; targetLang?: string; enabledTenses?: string[] });
          });
        });
        if (result.sourceLang) source = result.sourceLang;
        if (result.targetLang) target = result.targetLang;
        if (result.enabledTenses) tenses = result.enabledTenses;
      } catch (e) {
        console.warn('Chrome storage failed, falling back to localStorage:', e);
        const savedSource = localStorage.getItem('sourceLang');
        const savedTarget = localStorage.getItem('targetLang');
        const savedTenses = localStorage.getItem('enabledTenses');
        if (savedSource) source = savedSource;
        if (savedTarget) target = savedTarget;
        if (savedTenses) tenses = JSON.parse(savedTenses);
      }
    } else {
      const savedSource = localStorage.getItem('sourceLang');
      const savedTarget = localStorage.getItem('targetLang');
      const savedTenses = localStorage.getItem('enabledTenses');
      if (savedSource) source = savedSource;
      if (savedTarget) target = savedTarget;
      if (savedTenses) tenses = JSON.parse(savedTenses);
    }

    setSourceLang(source);
    setTargetLang(target);
    setEnabledTenses(tenses);
    return { sourceLang: source, targetLang: target, enabledTenses: tenses };
  };

  const saveLanguageSettings = (newSource: string, newTarget: string) => {
    setSourceLang(newSource);
    setTargetLang(newTarget);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ sourceLang: newSource, targetLang: newTarget }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome storage set failed:', chrome.runtime.lastError);
          }
        });
      } catch (e) {
        console.warn('Chrome storage threw error, falling back to localStorage:', e);
        localStorage.setItem('sourceLang', newSource);
        localStorage.setItem('targetLang', newTarget);
      }
    } else {
      localStorage.setItem('sourceLang', newSource);
      localStorage.setItem('targetLang', newTarget);
    }
  };

  const loadTranslationData = async (text: string, isPhrase: boolean, cleanText: string, style: React.CSSProperties, contextText?: string, currentSource: string = sourceLang, currentTarget: string = targetLang) => {
    setIsLoading(true);

    try {
      let translatedText: string | null = null;
      let entry: VerbEntry | undefined;
      let initialTense: string | undefined;

      const sourceUltralingua = SUPPORTED_LANGUAGES[currentSource]?.ultralinguaName || SUPPORTED_LANGUAGES[DEFAULT_SOURCE_LANG].ultralinguaName;
      const sourceGoogle = SUPPORTED_LANGUAGES[currentSource]?.isoCode || DEFAULT_SOURCE_LANG;
      const targetGoogle = SUPPORTED_LANGUAGES[currentTarget]?.isoCode || DEFAULT_TARGET_LANG;

      if (!isPhrase) {
        // 1. Try verb lookup first
        console.log('Fetching conjugations for:', cleanText);
        const conjugationResults = await fetchConjugations(cleanText, sourceUltralingua);
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

          // 2. Fetch translation
          translatedText = await translateWithDeepL(text, sourceGoogle, targetGoogle, contextText);

        } else {
          // Not a verb (or no conjugations found)
          console.log('No conjugations found, fetching DeepL translation...');
          translatedText = await translateWithDeepL(text, sourceGoogle, targetGoogle, contextText);
        }
      } else {
        // It is a phrase
        translatedText = await translateText(text, targetGoogle);
      }

      setSelection(prev => {
        if (prev && prev.word === text) {
          return {
            ...prev,
            translation: translatedText,
            entry: entry,
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSettings();
  }, []);

  useEffect(() => {
    const handleGlobalSelection = async (e: MouseEvent | KeyboardEvent) => {
      // Ignore clicks inside our overlay to prevent it from closing when using dropdowns
      if (overlayRef.current && e.target instanceof Node && overlayRef.current.contains(e.target)) {
        return;
      }

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

      // Extract Context for single words
      let contextText: string | undefined = undefined;
      if (!isPhrase && selectionObj.anchorNode && selectionObj.anchorNode.nodeType === Node.TEXT_NODE) {
        const textContent = selectionObj.anchorNode.textContent || '';
        const start = Math.min(selectionObj.anchorOffset, selectionObj.focusOffset);
        const end = Math.max(selectionObj.anchorOffset, selectionObj.focusOffset);

        // Find sentence boundaries (look backwards/forwards for punctuation)
        let sentenceStart = start;
        while (sentenceStart > 0 && !/[.!?\n]/.test(textContent[sentenceStart - 1])) {
          sentenceStart--;
        }

        let sentenceEnd = end;
        while (sentenceEnd < textContent.length && !/[.!?\n]/.test(textContent[sentenceEnd])) {
          sentenceEnd++;
        }
        if (sentenceEnd < textContent.length && /[.!?]/.test(textContent[sentenceEnd])) {
          sentenceEnd++;
        }

        const extracted = textContent.slice(sentenceStart, sentenceEnd).trim();
        if (extracted.length > text.length) {
          contextText = extracted;
        }
      }

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
        contextText,
        style,
        translation: null,
        isPhrase
      });

      // Refetch settings to ensure we have the latest before loading data
      const settings = await getSettings();

      // Load Data
      loadTranslationData(text, isPhrase, cleanText, style, contextText, settings.sourceLang, settings.targetLang);
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [selection]); // Removed verbData dep

  if (!selection) return null;

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value;
    saveLanguageSettings(newSource, targetLang);
    if (selection) {
      const cleanText = selection.word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");
      loadTranslationData(selection.word, selection.isPhrase || false, cleanText, selection.style, selection.contextText, newSource, targetLang);
    }
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = e.target.value;
    saveLanguageSettings(sourceLang, newTarget);
    if (selection) {
      const cleanText = selection.word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");
      loadTranslationData(selection.word, selection.isPhrase || false, cleanText, selection.style, selection.contextText, sourceLang, newTarget);
    }
  };

  let innerCard = null;

  if (selection.isPhrase) {
    innerCard = (
      <PhraseOverlay
        originalText={selection.word}
        translation={selection.translation || null}
        highlightedWords={selection.highlightedWords}
      />
    );
  } else if (selection.entry) {
    innerCard = (
      <TranslationCard
        word={selection.word}
        entry={selection.entry}
        translation={selection.translation}
        enabledTenses={selection.enabledTenses}
        initialTense={selection.initialTense}
      />
    );
  } else if (selection.translation && !selection.entry && !selection.isPhrase) {
    innerCard = (
      <DefinitionCard
        word={selection.word}
        translation={selection.translation}
      />
    );
  }

  if (!innerCard) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 flex flex-col items-center gap-1.5 pointer-events-none"
      style={selection.style}
    >
      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-slate-200 pointer-events-auto h-[32px] box-border">
        <select
          value={sourceLang}
          onChange={handleSourceLangChange}
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer appearance-none"
          disabled={isLoading}
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>{lang.displayName}</option>
          ))}
        </select>
        <span className="text-slate-400 text-xs">➡</span>
        <select
          value={targetLang}
          onChange={handleTargetLangChange}
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer appearance-none"
          disabled={isLoading}
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>{lang.displayName}</option>
          ))}
        </select>
        {isLoading && (
          <span className="flex h-3 w-3 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        )}
      </div>
      <div className="pointer-events-auto opacity-100 transition-opacity flex justify-center w-full">
        {innerCard}
      </div>
    </div>
  );
}
