import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './schil/App';
import './stijl/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
