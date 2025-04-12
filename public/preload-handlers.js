/**
 * Script pour précharger les gestionnaires de sélection d'éléments
 * Ce script est chargé au démarrage de l'application pour réduire la latence
 */

(function() {
  console.log('[Buildr] Preloading element selection scripts');

  // Éviter les chargements redondants
  if (document.querySelector('script[src="/parent-iframe-handler.js"]')) {
    console.log('[Buildr] Element selection scripts already loaded');
    return;
  }

  // Fonction pour précharger un script
  function preloadScript(src) {
    return new Promise((resolve, reject) => {
      // Créer le script directement sans link preload pour éviter les délais supplémentaires
      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Charger de façon synchrone pour s'assurer qu'il est disponible immédiatement

      script.onload = () => {
        console.log(`[Buildr] Script ${src} loaded successfully`);
        resolve(true);
      };

      script.onerror = (error) => {
        console.error(`[Buildr] Failed to load script ${src}:`, error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  // Précharger immédiatement pour les pages qui en ont besoin
  if (window.location.pathname.includes('/components/')) {
    preloadScript('/parent-iframe-handler.js')
      .then(() => {
        console.log('[Buildr] Element selection handler loaded proactively');
      })
      .catch(err => {
        console.warn('[Buildr] Failed to load element selection handler:', err);
      });
  } else {
    // Sur les autres pages, charger avec une faible priorité
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        preloadScript('/parent-iframe-handler.js')
          .then(() => {
            console.log('[Buildr] Element selection handler loaded');
          })
          .catch(err => {
            console.warn('[Buildr] Failed to load element selection handler:', err);
          });
      }, 2000);
    });
  }
})();