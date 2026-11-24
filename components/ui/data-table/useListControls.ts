import { useEffect, useState } from 'react';
import { updateTableUrl, useTableUrlState } from '../../../hooks/useTableUrlState';
import { pageSizes, type PageSize, type Sort } from './DataTable';

const maxOffset = 50_000;

export function sortParam<K extends string>({ key, direction }: Sort<K>) {
    return `${direction === 'desc' ? '-' : ''}${key}`;
}

export function useListControls<K extends string>(sortKeys: readonly K[], defaultSort: Sort<K>) {
    const params = useTableUrlState();
    const [value, change] = useState('');
    const [q, setQuery] = useState('');
    const [composing, compose] = useState(false);
    const [searchPage, setSearchPage] = useState(0);
    const trimmed = value.trim();
    const typing = trimmed !== q;
    const limit = pageSizes.find(size => size === Number(params.get('limit'))) ?? 25;
    const requestedPage = Number(params.get('page'));
    const urlPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 && (requestedPage - 1) * limit <= maxOffset ? requestedPage - 1 : 0;
    const page = q ? searchPage : urlPage;
    const requestedSort = params.get('sort');
    const key = sortKeys.find(candidate => candidate === requestedSort || `-${candidate}` === requestedSort);
    const sort: Sort<K> = key ? { key, direction: requestedSort?.startsWith('-') ? 'desc' : 'asc' } : defaultSort;

    function submit(term: string) {
        if (term.trim() === q) return;
        setQuery(term.trim());
        setSearchPage(0);
    }

    useEffect(() => {
        if (composing || !typing) return;
        const timer = window.setTimeout(() => {
            setQuery(trimmed);
            setSearchPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [composing, trimmed, typing]);

    useEffect(() => {
        function resetSearch() {
            change('');
            setQuery('');
            setSearchPage(0);
        }
        window.addEventListener('popstate', resetSearch);
        return () => window.removeEventListener('popstate', resetSearch);
    }, []);

    function criteria(values: Record<string, string | null>) {
        setSearchPage(0);
        updateTableUrl({ ...values, page: null });
    }

    function setSort(next: string) {
        criteria({ sort: next === sortParam(defaultSort) ? null : next });
    }

    function cycleSort(next: K) {
        setSort(!key || sort.key !== next ? next : sort.direction === 'asc' ? `-${next}` : sortParam(defaultSort));
    }

    return {
        params, q, typing, page, limit, offset: page * limit, canAdvance: (page + 1) * limit <= maxOffset, sort, setSort, cycleSort, criteria,
        search: { value, change, compose, submit },
        changePage(index: number) { if (q) setSearchPage(index); else updateTableUrl({ page: index ? String(index + 1) : null }); },
        changeSize(size: PageSize) { criteria({ limit: size === 25 ? null : String(size) }); },
    };
}
