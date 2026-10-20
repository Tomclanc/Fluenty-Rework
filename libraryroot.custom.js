/* Standalone entry: no missing imports, opener dependency, remote code or timers
   that run indefinitely. Steam remains usable when the expected DOM is absent. */
(() => {
  'use strict';
  if (window.__fluentyLight) return;
  const state = window.__fluentyLight = { mounted: false };
  const paths = {
    back: 'M16 4l-8 8 8 8',
    library: 'M4 3h5v18H4z M12 3h4v18h-4z M19 5l3 15',
    collections: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    store: 'M3 8h18l-2 13H5z M8 8V6a4 4 0 018 0v2',
    community: 'M8 12a4 4 0 100-8 4 4 0 000 8 M2 21v-3a6 6 0 0112 0v3 M17 5a3 3 0 010 6 M17 14a5 5 0 015 5v2',
    downloads: 'M12 3v12 M6 9l6 6 6-6 M4 17v4h16v-4',
    settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'
  };
  const chinese = navigator.language.toLowerCase().startsWith('zh');
  const english = {back:'Back',library:'Library',collections:'Collections',store:'Store',community:'Community',downloads:'Downloads',settings:'Settings'};
  const pages = [
    ['back','返回','#'],
    ['library','游戏库','steam://open/games','/library/home'],
    ['collections','收藏','steam://open/collections','/library/collections'],
    ['store','商店','steam://store'],
    ['community','社区','steam://openurl/https://steamcommunity.com/'],
    ['downloads','下载','steam://open/downloads','/library/downloads'],
    ['settings','设置','steam://open/settings']
  ];
  function getHost() {
    try {
      if (window.SteamUIStore) return window;
      if (window.opener && window.opener.SteamUIStore) return window.opener;
    } catch (_) { /* opener may be cross-origin */ }
    return null;
  }
  function mount() {
    if (state.mounted || !document.body) return state.mounted;

    const outer = document.querySelector('._3mz8wQ6Q44B8P7pzPP4Iyw');
    const content = outer?.querySelector('._1rDh5rXSFZJOqCa4UpnI4z');
    const title = outer?.querySelector('._39oUCO1OuizVPwcnnv88no');
    if (!outer || !content || !title) return false;
    if (document.getElementById('fluenty-light-nav')) return false;
    const nav = document.createElement('nav');
    nav.id = 'fluenty-light-nav';
    nav.setAttribute('aria-label',chinese ? 'Fluenty 导航' : 'Fluenty navigation');
    for (const [id,label,url,route] of pages) {
      const link = document.createElement('a');
      const displayLabel = chinese ? label : english[id];
      link.href = url;
      link.title = displayLabel;
      link.setAttribute('aria-label', displayLabel);
      link.dataset.page = id;
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[id]}"/></svg><span>${displayLabel}</span>`;
      link.addEventListener('click', event => {
        if (id === 'back') {
          event.preventDefault();
          document.querySelector('._25lBLzuVeYAUG279up4xP8')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          return;
        }
        if (id !== 'settings') {
          state.activePage = id;
          state.lastRoute = currentRoute();
          applySelection(id);
        }
        const host = getHost();
        if (route && typeof host?.SteamUIStore?.Navigate === 'function') {
          try { host.SteamUIStore.Navigate(route); event.preventDefault(); }
          catch (error) { console.warn('[Fluenty Light] Native URI fallback',error); }
        }
        // Selection is derived from Steam's current route, not a speculative click.
        requestAnimationFrame(syncSelection);
      });
      nav.appendChild(link);
    }
    document.documentElement.classList.add('fluenty-v3');
    document.body.appendChild(nav);
    state.mounted = true;
    syncSelection();
    return true;
  }
  function currentRoute() {
    let route = '';
    try { route = getHost()?.MainWindowBrowserManager?.m_history?.location?.pathname || location.pathname; } catch (_) {}
    return route;
  }
  function applySelection(selected) {
    document.querySelectorAll('#fluenty-light-nav a').forEach(a => {
      if (a.dataset.page === selected) {
        if (a.getAttribute('aria-current') !== 'page') a.setAttribute('aria-current','page');
      } else if (a.hasAttribute('aria-current')) a.removeAttribute('aria-current');
    });
  }
  function syncSelection() {
    const route = currentRoute();
    const selected = route.includes('/library/collections') ? 'collections'
      : route.includes('/library/downloads') ? 'downloads'
      : route.startsWith('/library') ? 'library'
      : /store|steampowered/.test(route) ? 'store'
      : /community|steamcommunity/.test(route) ? 'community' : null;
    // Steam's embedded web navigation may update after the native URI handler.
    if (route !== state.lastRoute || !state.activePage) {
      if (selected) state.activePage = selected;
      state.lastRoute = route;
    }
    applySelection(state.activePage || selected);
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!state.mounted) mount();
      if (state.mounted) syncSelection();
    });
  });
  mount();
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',syncSelection);
  window.addEventListener('hashchange',syncSelection);
  // Native Steam navigation does not always dispatch browser history events.
  document.addEventListener('click',() => requestAnimationFrame(syncSelection),true);
  window.addEventListener('pagehide',() => observer.disconnect(),{once:true});
})();

/* Fluent titlebar search proxy. Native library input remains owned by Steam. */
(() => {
  if (window.__flTopSearch) return;
  window.__flTopSearch = true;
  const nativeSelector = '._20QAC4WMXm8qFE8waUT5oo input';
  let box, input, pending = false;
  function sync() {
    pending = false;
    const drag = document.querySelector('._39oUCO1OuizVPwcnnv88no ._30vB9DdsPK7VrZAbb5Q1Av');
    if (!drag) return;
    if (!box || !box.isConnected) {
      box = document.createElement('div');
      box.id = 'fl-top-search';
      const icon = document.createElement('span');
      icon.textContent = '⌕';
      icon.setAttribute('aria-hidden', 'true');
      input = document.createElement('input');
      input.type = 'search';
      input.placeholder = navigator.language.toLowerCase().startsWith('zh') ? '搜索游戏库' : 'Search Library';
      input.setAttribute('aria-label', input.placeholder);
      box.append(icon, input);
      drag.appendChild(box);
      input.addEventListener('input', () => {
        const native = document.querySelector(nativeSelector);
        if (!native) return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(native, input.value);
        native.dispatchEvent(new Event('input', {bubbles:true}));
        native.dispatchEvent(new Event('change', {bubbles:true}));
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          input.value = '';
          input.dispatchEvent(new Event('input', {bubbles:true}));
          input.blur();
        }
      });
    }
    const native = document.querySelector(nativeSelector);
    box.hidden = !native;
    if (native && document.activeElement !== input) input.value = native.value;
  }
  const observer = new MutationObserver(() => {
    if (!pending) { pending = true; requestAnimationFrame(sync); }
  });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  document.addEventListener('input', e => {
    if (e.target.matches?.(nativeSelector) && input) input.value = e.target.value;
  });
  window.addEventListener('pagehide', () => observer.disconnect(), {once:true});
  sync();
})();
