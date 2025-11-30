import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';
import './index.css'; 

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  const newRoot = document.createElement('div');
  newRoot.id = 'langhover-extension-root';
  
  // FIXED positioning keeps it out of the document flow
  // 0 width/height ensures it doesn't trigger scrollbars
  newRoot.style.position = 'fixed';
  newRoot.style.top = '0';
  newRoot.style.left = '0';
  newRoot.style.width = '0';
  newRoot.style.height = '0';
  newRoot.style.overflow = 'visible'; // Let the popup spill out
  newRoot.style.zIndex = '2147483647';
  newRoot.style.pointerEvents = 'none'; // Clicks pass through
  
  document.body.appendChild(newRoot);

  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <ExtensionOverlay />
    </React.StrictMode>
  );
}