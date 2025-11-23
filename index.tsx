import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ExtensionOverlay from './components/ExtensionOverlay';

// IMPORT THE CSS FILE (It is in the same folder now, so this works)
import './index.css'; 

const rootElement = document.getElementById('root');

// ... rest of the code is the same ...
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  const newRoot = document.createElement('div');
  newRoot.id = 'langhover-extension-root';
  newRoot.style.position = 'absolute';
  newRoot.style.top = '0';
  newRoot.style.left = '0';
  newRoot.style.zIndex = '2147483647';
  newRoot.style.pointerEvents = 'none';
  document.body.appendChild(newRoot);

  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <ExtensionOverlay />
    </React.StrictMode>
  );
}