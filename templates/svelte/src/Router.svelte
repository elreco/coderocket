<script lang="ts">
  import { onMount } from 'svelte';
  import App from './App.svelte';
  import NotFound from './NotFound.svelte';
  let Component: any = $state(App);
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
    history.pushState = function (...args: any[]) {
      originalPushState.apply(history, args);
      updateRoute();
    };
    history.replaceState = function (...args: any[]) {
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