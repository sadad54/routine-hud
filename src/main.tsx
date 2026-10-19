import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startClock } from './clock/clock';
import { useApp } from './store/app';
import './index.css';

startClock();
void useApp.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: offline caching + notifications. Production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((err) => console.error('[pwa] registration failed', err));
}
