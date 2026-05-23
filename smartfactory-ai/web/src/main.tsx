import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')!

// Dismiss the inline splash screen as soon as React has painted its first frame.
// Using requestAnimationFrame twice ensures the browser has actually committed a paint.
function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.classList.add('hidden');
    // Remove from DOM after transition ends so it never blocks clicks
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }
}

createRoot(rootEl).render(<App />);

// Two rAF frames = first paint has definitely happened
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
