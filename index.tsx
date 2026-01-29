import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';
import Settings from './components/Settings';
import './index.css';

const rootElement = document.getElementById('langhover-dev-root');

if (rootElement) {
  // 1. POPUP or DEV MODE
  // If we are in the extension popup, we want to show Settings.
  // If we are in standard dev mode (npm run dev), we usually want to show the Demo App.

  // A simple heuristic: check if chrome.runtime.id is available to detect extension context.
  // OR check if we have a specific query param.
  // Since the user wants to replace the "test" page with settings in the extension,
  // and the extension popup loads index.html:

  const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  if (isExtensionContext) {
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

  // Create the "Host" element (This sits in the real website)
  const host = document.createElement('div');
  host.id = 'langhover-extension-host';
  // Reset the host so it doesn't affect the page layout
  host.style.display = 'block';
  host.style.all = 'initial';
  document.body.appendChild(host);

  // Create the "Shadow Root" (The invisible wall)
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject our CSS *inside* the Shadow DOM
  // We use chrome.runtime.getURL to find the file in the extension folder
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/index.css');
  shadow.appendChild(link);

  // Create the mount point for React INSIDE the shadow
  const mountPoint = document.createElement('div');
  mountPoint.id = 'langhover-shadow-root';
  shadow.appendChild(mountPoint);

  // Render the App
  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <ExtensionOverlay />
    </React.StrictMode>
  );
}