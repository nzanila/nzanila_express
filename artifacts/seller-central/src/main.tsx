import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LocaleProvider } from './lib/i18n/locale-context';
import { NoticeHost } from './components/confirm-dialog';
import { InstallAppPrompt } from './components/install-app-prompt';
import './index.css';

// Registered after load so it never competes with the first paint. Failures are ignored on
// purpose: no service worker means no offline shell and no install offer, but the app
// itself still works, and an error here would be noise the seller cannot act on.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
      <NoticeHost />
      <InstallAppPrompt />
    </LocaleProvider>
  </React.StrictMode>
);
