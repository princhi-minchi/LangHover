import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';
import './index.css';

const rootElement = document.getElementById('langhover-dev-root');

if (rootElement) {
  // 1. DEV MODE (npm run dev)
  // Just render normally for testing
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
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