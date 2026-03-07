/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress benign Vite WebSocket errors in the development environment
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('WebSocket closed without opened')) {
      event.preventDefault();
    }
  });
  window.addEventListener('error', (event) => {
    if (event.message?.includes('WebSocket closed without opened')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
