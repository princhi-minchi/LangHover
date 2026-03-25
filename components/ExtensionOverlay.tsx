import React, { useState, useEffect } from 'react';
import { ConjugationLookupResponse } from '../types';
import TranslationCard from './TranslationCard';
import { apiService } from '../services/apiService';
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE } from '../utils/languageConfig';

export default function ExtensionOverlay() {
  const [selection, setSelection] = useState<{
    word: string;
    response: ConjugationLookupResponse;
    style: React.CSSProperties;
    wordTranslation?: string;
    infinitiveTranslation?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  } | null>(null);

  const [sourceLanguage, setSourceLanguage] = useState<string>(DEFAULT_SOURCE_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState<string>(DEFAULT_TARGET_LANGUAGE);
  
  // Use a ref to track the current AbortController for active requests
  const abortControllerRef = React.useRef<AbortController | null>(null);
  
  // Detect if the user is on macOS
  const isMacOS = React.useMemo(() => {
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

  // 0. Helper to detect host page zoom
  const getPageZoomFactor = () => {
    const htmlRect = document.documentElement.getBoundingClientRect();
    if (!htmlRect.width) return 1;
    return window.innerWidth / htmlRect.width;
  };

  // 1. Listen to Global Document Events
  useEffect(() => {
    const handleGlobalSelection = async (event: MouseEvent | KeyboardEvent) => {
      // Check if the click is inside our extension card
      if (event.type === 'mouseup') {
        const target = event.target as HTMLElement;
        const extensionHost = document.getElementById('langhover-extension-host');
        
        // If clicking inside the extension, don't close the card
        if (extensionHost && extensionHost.contains(target)) {
          return;
        }
      }
      
      // REQUIREMENT: Only trigger if Ctrl (Windows/Linux) or Cmd (Mac) is held
      const isModifierKey = isMacOS ? event.metaKey : event.ctrlKey;
      
      if (!isModifierKey) {
        // If we click without modifier, close the current card
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
      
      // Only process single words or very short phrases (up to 2 words)
      if (!text || text.split(/\s+/).length > 2) {
        return;
      }

      // RACE CONDITION PREVENTION: Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      console.log(`Detected selection (${isMacOS ? 'Cmd' : 'Ctrl'} held):`, text);

      // Context extraction
      const range = selectionObj.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const selectionContext = container.parentElement?.innerText || container.textContent || '';

      try {
        // Trigger all API calls in parallel with the abort signal
        const conjugationPromise = apiService.lookupConjugation(sourceLanguage, {
          selection: text,
          selectionContext: selectionContext
        }, signal);

        const wordTranslationPromise = apiService.translateWithDeepL({
          text: text,
          target_lang: targetLanguage.toUpperCase(),
          source_lang: sourceLanguage.toUpperCase(),
          context: selectionContext
        }, signal);

        const data = await conjugationPromise;
        
        if (data.entry) {
          // Now that we have the infinitive, fetch its translation
          const infinitiveTranslationPromise = apiService.translateWithDeepL({
            text: data.entry.infinitive,
            target_lang: targetLanguage.toUpperCase(),
            source_lang: sourceLanguage.toUpperCase()
          }, signal);

          // Wait for both translation results
          const [wordTrans, infTrans] = await Promise.all([
            wordTranslationPromise,
            infinitiveTranslationPromise
          ]);

          // Check if we were aborted while waiting
          if (signal.aborted) return;

          const rect = range.getBoundingClientRect();
          const zoomFactor = getPageZoomFactor();
          
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          
          const CARD_WIDTH = 340;
          const CARD_HEIGHT = 450; 
          const GAP = 12;

          // Correct raw rect for host-page zoom
          const correctedRect = {
            left: rect.left / zoomFactor,
            right: rect.right / zoomFactor,
            top: rect.top / zoomFactor,
            bottom: rect.bottom / zoomFactor,
            width: rect.width / zoomFactor,
          };

          // Horizontal Positioning (Clamp to viewport)
          let left = correctedRect.left + (correctedRect.width / 2) - (CARD_WIDTH / 2);
          left = Math.max(16, Math.min(left, viewportWidth - CARD_WIDTH - 16));

          // Vertical Positioning
          const spaceBelow = viewportHeight - correctedRect.bottom;
          let style: React.CSSProperties = { left, width: CARD_WIDTH, position: 'fixed' };

          if (spaceBelow < (CARD_HEIGHT + GAP) && correctedRect.top > (CARD_HEIGHT + GAP)) {
            style.bottom = viewportHeight - correctedRect.top + GAP;
          } else {
            style.top = correctedRect.bottom + GAP;
          }

          setSelection({
            word: text,
            response: data,
            style,
            wordTranslation: wordTrans,
            infinitiveTranslation: infTrans,
            sourceLanguage,
            targetLanguage
          });
        } else {
          setSelection(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Request was cancelled due to new selection');
          return;
        }
        console.error('Lookup failed:', err);
        setSelection(null);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    };

    document.addEventListener('mouseup', handleGlobalSelection);
    document.addEventListener('keyup', handleGlobalSelection);
    return () => {
      document.removeEventListener('mouseup', handleGlobalSelection);
      document.removeEventListener('keyup', handleGlobalSelection);
    };
  }, [sourceLanguage, targetLanguage, isMacOS]);

  if (!selection) return null;

  return (
    <TranslationCard 
      word={selection.word} 
      response={selection.response} 
      style={selection.style}
      wordTranslation={selection.wordTranslation}
      infinitiveTranslation={selection.infinitiveTranslation}
      sourceLanguage={selection.sourceLanguage}
      targetLanguage={selection.targetLanguage}
    />
  );
}
