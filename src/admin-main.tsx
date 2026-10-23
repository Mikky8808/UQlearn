import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import AdminApp from './components/admin/App';
import './index.css';

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const basename = pathname.startsWith('/admin') ? '/admin' : '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppProvider>
          <AdminApp />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
