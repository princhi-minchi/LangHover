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
import { useDarkMode } from '../utils/useDarkMode';

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE', 'BODY'
]);

function extractSentenceFromText(text: string, start: number, end: number): string {
  let sStart = start;
  while (sStart > 0 && !/[.!?\n]/.test(text[sStart - 1])) sStart--;
  let sEnd = end;
  while (sEnd < text.length && !/[.!?\n]/.test(text[sEnd])) sEnd++;
  if (sEnd < text.length && /[.!?]/.test(text[sEnd])) sEnd++;
  return text.slice(sStart, sEnd).trim();
}

function extractSentenceContext(sel: Selection, selectedText: string): string | undefined {
  const anchorNode = sel.anchorNode;
  if (!anchorNode) return undefined;

  // Fast path: try the anchor text node directly
  if (anchorNode.nodeType === Node.TEXT_NODE) {
    const tc = anchorNode.textContent || '';
    const start = Math.min(sel.anchorOffset, sel.focusOffset);
    const end = Math.max(sel.anchorOffset, sel.focusOffset);
    const sentence = extractSentenceFromText(tc, start, end);
    if (sentence && sentence.length > selectedText.length) return sentence;
  }

  // Fallback: walk up the DOM to the nearest block-level ancestor
  // This handles cases where the word is wrapped in <span>, <b>, <em>, etc.
  let el: Element | null = anchorNode.nodeType === Node.TEXT_NODE
    ? (anchorNode as Text).parentElement
    : (anchorNode as Element);
  while (el && !BLOCK_TAGS.has(el.tagName)) {
    el = el.parentElement;
  }
  if (!el) return undefined;

  const blockText = (el as HTMLElement).innerText || '';
  const wordIdx = blockText.indexOf(selectedText);
  if (wordIdx === -1) return undefined;
  const sentence = extractSentenceFromText(blockText, wordIdx, wordIdx + selectedText.length);
  return sentence && sentence.length > selectedText.length ? sentence : undefined;
}

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
  const [darkMode, toggleDarkMode] = useDarkMode();

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

  const saveTranslationToStorage = (word: string, context: string, translation: string, isVerb: boolean, infinitive?: string, savedSourceLang?: string, savedTargetLang?: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['savedTranslations'], (result) => {
        const saved = (result.savedTranslations as any[]) || [];
        const newEntry = {
          word,
          context,
          translation,
          isVerb,
          infinitive: infinitive || null,
          sourceLang: savedSourceLang || 'it',
          targetLang: savedTargetLang || 'en',
          timestamp: Date.now()
        };

        // Don't save duplicates
        if (!saved.some((item: any) => item.word === word && item.context === context)) {
          chrome.storage.local.set({ savedTranslations: [...saved, newEntry] }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to save translation:', chrome.runtime.lastError);
            }
          });
        }
      });
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
        console.log('Fetching conjugations for:', cleanText);
        const conjugationResults = await fetchConjugations(cleanText, sourceUltralingua);
        console.log('Conjugation results:', conjugationResults);

        if (conjugationResults && conjugationResults.length > 0) {
          const bestMatch = conjugationResults[0];
          entry = adaptConjugationsToVerbEntry(bestMatch.infinitive, 'Definition unavailable', bestMatch.conjugations);

          for (const [tenseName, conjugationSet] of Object.entries(entry.tenses)) {
            if (Object.values(conjugationSet).some(val => val.toLowerCase() === cleanText)) {
              initialTense = tenseName;
              break;
            }
          }

          translatedText = await translateWithDeepL(text, sourceGoogle, targetGoogle, contextText);

        } else {
          console.log('No conjugations found, fetching DeepL translation...');
          translatedText = await translateWithDeepL(text, sourceGoogle, targetGoogle, contextText);
        }
      } else {
        translatedText = await translateText(text, targetGoogle);
      }

      setSelection(prev => {
        if (prev && prev.word === text) {
          if (translatedText && !isPhrase) {
            saveTranslationToStorage(
              text,
              contextText || text,
              translatedText,
              !!entry,
              entry?.infinitive,
              currentSource,
              currentTarget
            );
          }
          return {
            ...prev,
            translation: translatedText,
            entry: entry,
            highlightedWords: [],
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

      const isPhrase = text.includes(' ');

      const contextText: string | undefined = !isPhrase
        ? extractSentenceContext(selectionObj, text)
        : undefined;

      const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()?\"'\[\]]/g, "");

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

      if (selection && selection.word === text) {
        setSelection(prev => prev ? ({ ...prev, style }) : null);
        return;
      }

      setSelection({
        word: text,
        contextText,
        style,
        translation: null,
        isPhrase
      });

      const settings = await getSettings();
      loadTranslationData(text, isPhrase, cleanText, style, contextText, settings.sourceLang, settings.targetLang);
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [selection]);

  if (!selection) return null;

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value;
    saveLanguageSettings(newSource, targetLang);
    if (selection) {
      const cleanText = selection.word.toLowerCase().replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()?\"'\[\]]/g, "");
      loadTranslationData(selection.word, selection.isPhrase || false, cleanText, selection.style, selection.contextText, newSource, targetLang);
    }
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = e.target.value;
    saveLanguageSettings(sourceLang, newTarget);
    if (selection) {
      const cleanText = selection.word.toLowerCase().replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()?\"'\[\]]/g, "");
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
        darkMode={darkMode}
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
        darkMode={darkMode}
      />
    );
  } else if (selection.translation && !selection.entry && !selection.isPhrase) {
    innerCard = (
      <DefinitionCard
        word={selection.word}
        translation={selection.translation}
        darkMode={darkMode}
      />
    );
  }

  if (!innerCard) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed z-50 flex flex-col items-stretch pointer-events-auto rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${selection.isPhrase ? 'max-w-md w-max' : 'w-80'} ${darkMode ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-900/10'}`}
      style={selection.style}
    >
      {/* Top Control Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b gap-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100/50 border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <select
            value={sourceLang}
            onChange={handleSourceLangChange}
            className={`bg-transparent text-xs font-bold outline-none cursor-pointer appearance-none ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
            disabled={isLoading}
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
              <option key={code} value={code}>{lang.displayName}</option>
            ))}
          </select>
          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>➡</span>
          <select
            value={targetLang}
            onChange={handleTargetLangChange}
            className={`bg-transparent text-xs font-bold outline-none cursor-pointer appearance-none ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
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

        <div className="flex items-center gap-1">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`flex items-center justify-center rounded p-1 transition-colors ${darkMode ? 'text-amber-400 hover:bg-slate-700' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/50'}`}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              /* Sun icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Dashboard Button */}
          <button
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime) {
                window.open(chrome.runtime.getURL('index.html?page=dashboard'), '_blank');
              } else {
                window.open('/?page=dashboard', '_blank');
              }
            }}
            className={`flex items-center justify-center rounded p-1 transition-colors ${darkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50'}`}
            title="Go to Dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full">
        {innerCard}
      </div>
    </div>
  );
}
