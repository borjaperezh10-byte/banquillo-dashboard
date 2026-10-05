import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/big-shoulders-display';
import './styles.css';
import { StoreProvider } from './lib/store.js';
import App from './App.jsx';
import { AuthGate } from './lib/auth.jsx';

createRoot(document.getElementById('root')).render(
  <AuthGate>
    <StoreProvider>
      <App />
    </StoreProvider>
  </AuthGate>,
);
