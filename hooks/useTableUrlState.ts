import { useSyncExternalStore } from 'react';

const URL_CHANGE = 'dashboard-url-change';

function subscribe(notify: () => void) {
    window.addEventListener(URL_CHANGE, notify);
    window.addEventListener('popstate', notify);
    return () => {
        window.removeEventListener(URL_CHANGE, notify);
        window.removeEventListener('popstate', notify);
    };
}

export function useTableUrlState() {
    const search = useSyncExternalStore(subscribe, () => window.location.search);
    return new URLSearchParams(search);
}

export function updateTableUrl(values: Record<string, string | readonly string[] | null>, replace = false) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
        url.searchParams.delete(key);
        if (typeof value === 'string') url.searchParams.set(key, value);
        else if (value) value.forEach(item => url.searchParams.append(key, item));
    }
    if (url.href === window.location.href) return;
    if (replace) window.history.replaceState(window.history.state, '', url);
    else window.history.pushState(null, '', url);
    window.dispatchEvent(new Event(URL_CHANGE));
}
