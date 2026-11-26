import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { DesktopProvider } from './app/contexts/desktop';
import { SessionProvider } from './app/contexts/session';
import { WorkspaceProvider } from './app/contexts/workspace';
import { I18nProvider } from './lib/i18n/i18n';
import './styles/global.css';
import './styles/ui.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found');
}

createRoot(container).render(
  <StrictMode>
    <DesktopProvider>
      <I18nProvider>
        <SessionProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </SessionProvider>
      </I18nProvider>
    </DesktopProvider>
  </StrictMode>,
);
