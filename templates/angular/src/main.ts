import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

const setupRouteChangeBridge = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const bridgeWindow = window as Window & {
    __coderocketRouteBridgeInitialized?: boolean;
  };

  if (bridgeWindow.__coderocketRouteBridgeInitialized) {
    return;
  }
  bridgeWindow.__coderocketRouteBridgeInitialized = true;

  const notifyParent = () => {
    try {
      window.parent?.postMessage(
        {
          type: 'coderocket-route-change',
          path: window.location.pathname + window.location.search + window.location.hash,
        },
        '*',
      );
    } catch {
      // Ignore cross-origin errors
    }
  };

  type HistoryMethod = typeof window.history.pushState;

  const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
    const original = window.history[method] as HistoryMethod;
    window.history[method] = function (...args) {
      const result = original.apply(this, args as Parameters<HistoryMethod>);
      notifyParent();
      return result;
    } as HistoryMethod;
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', notifyParent);
  window.addEventListener('hashchange', notifyParent);
  notifyParent();
};

setupRouteChangeBridge();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
