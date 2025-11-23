import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';

// 1. Check if we are in the "Popup" or "Demo" mode (where #root exists)
const rootElement = document.getElementById('root');

if (rootElement) {
  // We are in the popup or local demo - Render the full App
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // 2. We are in "Extension Mode" (Content Script) on a random webpage
  
  // A. Inject Tailwind CSS so our card looks pretty
  // (Note: In a pro app you'd build CSS files, but this is the easiest way for now)
  const script = document.createElement('script');
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);

  // B. Create a new container for our app to live in
  const newRoot = document.createElement('div');
  newRoot.id = 'langhover-extension-root';
  // Make sure our container is on top of everything
  newRoot.style.position = 'absolute';
  newRoot.style.top = '0';
  newRoot.style.left = '0';
  newRoot.style.zIndex = '999999';
  document.body.appendChild(newRoot);

  // C. Render ONLY the Overlay (we don't want the big demo text on Google!)
  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <ExtensionOverlay />
    </React.StrictMode>
  );
}
