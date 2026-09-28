import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerServiceWorker } from './pushNotifications.js';
import { ToastProvider } from './components/ToastProvider.jsx';

registerServiceWorker().catch(() => {});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
