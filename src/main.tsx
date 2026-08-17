import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/700.css';
import './shared/styles/tokens.css';
import './shared/styles/chrome.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
