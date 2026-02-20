import React, { useEffect, useState, useRef } from 'react';
import { translateText } from '../services/translationService';
import { fetchConjugations, fetchDefinitions } from '../services/ultralinguaService';
import { adaptConjugationsToVerbEntry } from '../utils/apiAdapters';
import { VerbEntry, UltralinguaDefinitionItem } from '../types';
import TranslationCard from './TranslationCard';
import DefinitionCard from './DefinitionCard';
import PhraseOverlay from './PhraseOverlay';
import { ALL_TENSES } from '../utils/tenseMapping';
import { SUPPORTED_LANGUAGES, DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from '../utils/languageMapping';

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
      const result = await new Promise<{ sourceLang?: string; targetLang?: string; enabledTenses?: string[] }>(resolve =>
        chrome.storage.local.get(['sourceLang', 'targetLang', 'enabledTenses'], (items) => resolve(items as { sourceLang?: string; targetLang?: string; enabledTenses?: string[] }))
      );
      if (result.sourceLang) source = result.sourceLang;
      if (result.targetLang) target = result.targetLang;
      if (result.enabledTenses) tenses = result.enabledTenses;
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
      chrome.storage.local.set({ sourceLang: newSource, targetLang: newTarget });
    } else {
      localStorage.setItem('sourceLang', newSource);
      localStorage.setItem('targetLang', newTarget);
    }
  };

  const loadTranslationData = async (text: string, isPhrase: boolean, cleanText: string, style: React.CSSProperties, currentSource: string = sourceLang, currentTarget: string = targetLang) => {
    setIsLoading(true);

    try {
      let translatedText: string | null = null;
      let infinitiveTranslatedText: string | null = null;
      let entry: VerbEntry | undefined;
      let definitions: UltralinguaDefinitionItem[] | undefined;
      let initialTense: string | undefined;

      const sourceUltralingua = SUPPORTED_LANGUAGES[currentSource]?.ultralinguaName || SUPPORTED_LANGUAGES[DEFAULT_SOURCE_LANG].ultralinguaName;
      const targetUltralingua = SUPPORTED_LANGUAGES[currentTarget]?.ultralinguaName || SUPPORTED_LANGUAGES[DEFAULT_TARGET_LANG].ultralinguaName;
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

          // 2. Fetch BOTH translations
          const p1 = translateText(text, targetGoogle);
          const p2 = translateText(bestMatch.infinitive, targetGoogle);

          const [t1, t2] = await Promise.all([p1, p2]);
          translatedText = t1;
          infinitiveTranslatedText = t2;

        } else {
          // Not a verb (or no conjugations found)
          console.log('No conjugations found, checking definitions...');
          const defs = await fetchDefinitions(cleanText, sourceUltralingua, targetUltralingua);

          if (defs && defs.length > 0) {
            definitions = defs;
          } else {
            console.log('No definitions found, falling back to translation');
            translatedText = await translateText(text, targetGoogle);
          }
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

      // Refetch settings to ensure we have the latest before loading data
      const settings = await getSettings();

      // Load Data
      loadTranslationData(text, isPhrase, cleanText, style, settings.sourceLang, settings.targetLang);
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
      loadTranslationData(selection.word, selection.isPhrase || false, cleanText, selection.style, newSource, targetLang);
    }
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = e.target.value;
    saveLanguageSettings(sourceLang, newTarget);
    if (selection) {
      const cleanText = selection.word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, "");
      loadTranslationData(selection.word, selection.isPhrase || false, cleanText, selection.style, sourceLang, newTarget);
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
        infinitiveTranslation={selection.infinitiveTranslation}
        enabledTenses={selection.enabledTenses}
        initialTense={selection.initialTense}
      />
    );
  } else if (selection.definitions) {
    innerCard = (
      <DefinitionCard
        word={selection.word}
        definitions={selection.definitions}
      />
    );
  } else if (selection.translation && !selection.entry && !selection.definitions) {
    innerCard = (
      <PhraseOverlay
        originalText={selection.word}
        translation={selection.translation}
        highlightedWords={[]}
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
