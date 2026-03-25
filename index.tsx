import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';
import Settings from './components/Settings';
import Dashboard from './dashboard';
import './index.css';

// Safety guard: on extension-owned pages (chrome-extension://), this file runs BOTH as the
// page's own <script> tag AND potentially as a content script. We use a flag to ensure only
// one instance of React is ever mounted.
if (!(window as any).__langhoverMounted) {
  (window as any).__langhoverMounted = true;

  const init = () => {
    const rootElement = document.getElementById('langhover-dev-root');

    if (rootElement) {
      // 1. POPUP or DEV MODE
      const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
      const urlParams = new URLSearchParams(window.location.search);
      const isDashboard = urlParams.get('page') === 'dashboard' || window.location.pathname.includes('dashboard');

      if (isDashboard) {
        ReactDOM.createRoot(rootElement).render(
          <React.StrictMode>
            <Dashboard />
          </React.StrictMode>
        );
      } else if (isExtensionContext) {
        // Extension Popup -> Settings
        ReactDOM.createRoot(rootElement).render(
          <React.StrictMode>
            <Settings />
          </React.StrictMode>
        );
      } else {
        // Dev Mode -> Test Page (App)
        ReactDOM.createRoot(rootElement).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      }

    } else {
      // 2. EXTENSION MODE (Real Website)
      const host = document.createElement('div');
      host.id = 'langhover-extension-host';
      host.style.all = 'initial';
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.width = '0';
      host.style.height = '0';
      host.style.zIndex = '2147483647';
      host.style.overflow = 'visible';
      host.style.zoom = '1';
      host.style.transform = 'none';
      host.style.display = 'block';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('assets/index.css');
      shadow.appendChild(link);

      const mountPoint = document.createElement('div');
      mountPoint.id = 'langhover-shadow-root';
      shadow.appendChild(mountPoint);

      ReactDOM.createRoot(mountPoint).render(
        <React.StrictMode>
          <ExtensionOverlay />
        </React.StrictMode>
      );
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}