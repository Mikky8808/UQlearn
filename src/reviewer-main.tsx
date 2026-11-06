import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import ReviewerApp from './components/reviewer/App';
import './index.css';

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const basename = pathname.startsWith('/rev') ? '/rev' : '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppProvider>
          <ReviewerApp />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
