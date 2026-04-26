import { React, html } from './vendor.js';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { AppProvider } from './context/AppContext.js';

createRoot(document.getElementById('root')).render(
  html`
    <${React.StrictMode}>
      <${AppProvider}>
        <${App} />
      <//>
    <//>
  `,
);
