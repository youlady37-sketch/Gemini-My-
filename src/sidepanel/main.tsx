import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanelApp } from './App';
import '../index.css';

const rootElem = document.getElementById('sidepanel-root');
if (rootElem) {
  createRoot(rootElem).render(
    <StrictMode>
      <SidePanelApp />
    </StrictMode>
  );
}
