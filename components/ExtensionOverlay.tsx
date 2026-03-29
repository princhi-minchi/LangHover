import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SelectionState } from '../types';
import TranslationCard from './TranslationCard';
import PhraseTranslationCard from './PhraseTranslationCard';
import { apiService } from '../services/apiService';
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE } from '../utils/languageConfig';

export default function ExtensionOverlay() {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const [sourceLanguage, setSourceLanguage] = useState<string>(DEFAULT_SOURCE_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState<string>(DEFAULT_TARGET_LANGUAGE);
  
  // Use a ref to track the current AbortController for active requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Detect if the user is on macOS
  const isMacOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
           navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  }, []);

  // Load language settings from storage
  useEffect(() => {
    const isContextValid = () => {
      try {
        return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
      } catch (e) {
        return false;
      }
    };

    const loadLanguageSettings = () => {
      if (isContextValid() && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['sourceLanguage', 'targetLanguage'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Context invalidated while loading settings');
            return;
          }
          if (result.sourceLanguage) {
            setSourceLanguage(result.sourceLanguage);
          }
          if (result.targetLanguage) {
            setTargetLanguage(result.targetLanguage);
          }
        });
      } else {
        // Fallback for dev mode or invalidated context
        const savedSourceLang = localStorage.getItem('sourceLanguage');
        const savedTargetLang = localStorage.getItem('targetLanguage');
        if (savedSourceLang) setSourceLanguage(savedSourceLang);
        if (savedTargetLang) setTargetLanguage(savedTargetLang);
      }
    };

    loadLanguageSettings();

    // Add listener for storage changes to update languages in real-time
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (!isContextValid()) return;
      
      if (changes.sourceLanguage) {
        setSourceLanguage(changes.sourceLanguage.newValue);
      }
      if (changes.targetLanguage) {
        setTargetLanguage(changes.targetLanguage.newValue);
      }
    };

    if (isContextValid() && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        if (isContextValid() && chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        }
      };
    }
  }, []);

  // Helper to detect host page zoom
  const getPageZoomFactor = () => {
    const htmlRect = document.documentElement.getBoundingClientRect();
    if (!htmlRect.width) return 1;
    return window.innerWidth / htmlRect.width;
  };

  // Helper to compute card positioning
  const computeCardStyle = (range: Range, cardHeight: number): React.CSSProperties => {
    const rect = range.getBoundingClientRect();
    const zoomFactor = getPageZoomFactor();
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const CARD_WIDTH = 330; 
    const GAP = 12;

    const correctedRect = {
      left: rect.left / zoomFactor,
      right: rect.right / zoomFactor,
      top: rect.top / zoomFactor,
      bottom: rect.bottom / zoomFactor,
      width: rect.width / zoomFactor,
    };

    let left = correctedRect.left + (correctedRect.width / 2) - (CARD_WIDTH / 2);
    left = Math.max(16, Math.min(left, viewportWidth - CARD_WIDTH - 16));

    const spaceBelow = viewportHeight - correctedRect.bottom;
    let style: React.CSSProperties = { left, width: CARD_WIDTH, position: 'fixed' };

    if (spaceBelow < (cardHeight + GAP) && correctedRect.top > (cardHeight + GAP)) {
      style.bottom = viewportHeight - correctedRect.top + GAP;
    } else {
      style.top = correctedRect.bottom + GAP;
    }
    
    return style;
  };

  // 1. Listen to Global Document Events
  useEffect(() => {
    const handleGlobalSelection = async (event: MouseEvent | KeyboardEvent) => {
      // Check if the click is inside our extension card
      if (event.type === 'mouseup') {
        const target = event.target as HTMLElement;
        const extensionHost = document.getElementById('langhover-extension-host');
        
        if (extensionHost && extensionHost.contains(target)) {
          return;
        }
      }
      
      // REQUIREMENT: Only trigger if Ctrl (Windows/Linux) or Cmd (Mac) is held
      const isModifierKey = isMacOS ? event.metaKey : event.ctrlKey;
      
      if (!isModifierKey) {
        if (event.type === 'mouseup') {
          setSelection(null);
        }
        return;
      }

      const selectionObj = window.getSelection();
      
      if (!selectionObj || selectionObj.rangeCount === 0 || selectionObj.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = selectionObj.toString().trim();
      if (!text) return;

      // New: Calculate word count to route the request
      const wordCount = text.split(/\s+/).length;

      // RACE CONDITION PREVENTION: Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      console.log(`Detected selection (${wordCount} words):`, text);

      // Context extraction
      const range = selectionObj.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parentElement = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
      const selectionContext = parentElement?.innerText || container.textContent || '';

      try {
        // ROUTING LOGIC:
        // 1. If > 5 words, skip conjugation and go direct to phrase translation
        if (wordCount > 5) {
          await runPhraseTranslation(text, range, signal);
          return;
        }

        // 2. If <= 5 words: show loading overlay immediately, then try conjugation
        const loadingStyle = computeCardStyle(range, 250);
        setSelection({
          mode: 'loading',
          word: text,
          style: loadingStyle,
          sourceLanguage,
          targetLanguage
        });

        const conjugationPromise = apiService.lookupConjugation(sourceLanguage, {
          selection: text,
          selectionContext: selectionContext
        }, signal);

        // Fetch word translation in parallel (used for both card types)
        const wordTranslationPromise = apiService.translateWithDeepL({
          text: text,
          target_lang: targetLanguage.toUpperCase(),
          source_lang: sourceLanguage.toUpperCase(),
          context: selectionContext
        }, signal);

        try {
          const data = await conjugationPromise;
          
          if (data.entry) {
            // Conjugation found!
            const infinitiveTranslationPromise = apiService.translateWithDeepL({
              text: data.entry.infinitive,
              target_lang: targetLanguage.toUpperCase(),
              source_lang: sourceLanguage.toUpperCase()
            }, signal);

            const [wordTrans, infTrans] = await Promise.all([
              wordTranslationPromise,
              infinitiveTranslationPromise
            ]);

            if (signal.aborted) return;

            const style = computeCardStyle(range, 450);
            setSelection({
              mode: 'conjugation',
              word: text,
              response: data,
              style,
              wordTranslation: wordTrans,
              infinitiveTranslation: infTrans,
              sourceLanguage,
              targetLanguage
            });
          } else {
            // No conjugation entry found, fall back to phrase translation
            const translation = await wordTranslationPromise;
            if (signal.aborted) return;
            
            const style = computeCardStyle(range, 250);
            setSelection({
              mode: 'phrase',
              phrase: text,
              translation: translation,
              style,
              sourceLanguage,
              targetLanguage
            });
          }
        } catch (err: any) {
          // If conjugation lookup fails (404/no match), try phrase fallback
          console.warn('Conjugation lookup failed, falling back to phrase translation');
          const translation = await wordTranslationPromise;
          if (signal.aborted) return;

          const style = computeCardStyle(range, 250);
          setSelection({
            mode: 'phrase',
            phrase: text,
            translation: translation,
            style,
            sourceLanguage,
            targetLanguage
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Request was cancelled');
          return;
        }
        console.error('Feature execution failed:', err);
        setSelection(null);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    };

    // Helper: Run phrase translation logic directly
    const runPhraseTranslation = async (text: string, range: Range, signal: AbortSignal) => {
      // Show card immediately with loading state
      const style = computeCardStyle(range, 250);
      setSelection({
        mode: 'phrase',
        phrase: text,
        translation: undefined,
        style,
        sourceLanguage,
        targetLanguage
      });

      const translation = await apiService.translateWithDeepL({
        text: text,
        target_lang: targetLanguage.toUpperCase(),
        source_lang: sourceLanguage.toUpperCase()
      }, signal);

      if (signal.aborted) return;

      setSelection(prev => {
        if (prev?.mode === 'phrase' && prev.phrase === text) {
          return { ...prev, translation };
        }
        return prev;
      });
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [sourceLanguage, targetLanguage, isMacOS]);

  if (!selection) return null;

  if (selection.mode === 'loading') {
    return (
      <div
        className="fixed z-[2147483647] bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200 ease-out flex flex-col ring-1 ring-slate-900/5 backdrop-blur-xl"
        style={{ ...selection.style, width: '330px' }}
      >
        {/* Loading Header */}
        <div className="grid grid-cols-2 bg-gradient-to-br from-white via-white to-slate-50/30 border-b border-slate-100">
          <div className="px-5 py-4 border-r border-slate-100">
            <div className="text-xl font-black text-slate-900 truncate leading-tight">{selection.word}</div>
            <div className="h-3 mt-1.5 bg-slate-100 rounded animate-pulse w-16" />
          </div>
          <div className="px-5 py-4 bg-slate-50/20 flex flex-col justify-center gap-1.5">
            <div className="h-3 bg-slate-100 rounded animate-pulse w-20" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-14" />
          </div>
        </div>
        {/* Loading Skeleton Body */}
        <div className="flex-1 px-6 py-5 bg-white/40 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Loading Footer */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Looking up…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {selection.mode === 'conjugation' ? (
        <TranslationCard 
          word={selection.word} 
          response={selection.response} 
          style={selection.style}
          wordTranslation={selection.wordTranslation}
          infinitiveTranslation={selection.infinitiveTranslation}
          sourceLanguage={selection.sourceLanguage}
          targetLanguage={selection.targetLanguage}
        />
      ) : (
        <PhraseTranslationCard
          phrase={selection.phrase}
          translation={selection.translation}
          style={selection.style}
          sourceLanguage={selection.sourceLanguage}
          targetLanguage={selection.targetLanguage}
        />
      )}
    </>
  );
}
