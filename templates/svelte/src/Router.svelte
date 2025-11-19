<script>
  import { onMount } from 'svelte';
  import App from './App.svelte';
  import NotFound from './NotFound.svelte';

  let Component = App;

  const updateRoute = () => {
    const path = window.location.pathname;
    Component = path === '/' ? App : NotFound;
  };

  onMount(() => {
    updateRoute();

    window.addEventListener('popstate', updateRoute);
    window.addEventListener('hashchange', updateRoute);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      updateRoute();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      updateRoute();
    };

    return () => {
      window.removeEventListener('popstate', updateRoute);
      window.removeEventListener('hashchange', updateRoute);
    };
  });
</script>

<svelte:component this={Component} />

