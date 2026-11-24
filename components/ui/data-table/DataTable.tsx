import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';

export const pageSizes = [25, 50, 100] as const;
export type PageSize = (typeof pageSizes)[number];
export type Sort<K extends string> = { key: K; direction: 'asc' | 'desc' };

export interface Column<T, K extends string> {
    id: string;
    header: string;
    cell: (row: T, blocked: boolean) => React.ReactNode;
    sortKey?: K;
    className?: string;
    hideBelow?: 'lg' | 'xl';
}

interface DataTableProps<T, K extends string> {
    title: string;
    toolbar: React.ReactNode;
    columns: readonly Column<T, K>[];
    rows: readonly T[];
    renderMobileCard: (row: T, blocked: boolean) => React.ReactNode;
    sort: Sort<K>;
    onSort: (key: K) => void;
    page: {
        index: number; size: PageSize; total: number | null; capped: boolean; hasMore: boolean;
        change: (index: number) => void; changeSize: (size: PageSize) => void; prefetchNext: () => void;
    };
    pending: boolean;
    refreshing: boolean;
    blocked: boolean;
    error?: string;
    retry: () => void;
    empty: React.ReactNode;
}

const number = new Intl.NumberFormat('es-MX');
const hideClasses = { lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };
const paginationButton = '!min-h-11 !px-2 md:!min-h-9 md:!py-1 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-white';

export function DataTable<T extends { id: string }, K extends string>({
    title, toolbar, columns, rows, renderMobileCard, sort, onSort, page, pending, refreshing, blocked, error, retry, empty,
}: DataTableProps<T, K>) {
    const offset = page.index * page.size;
    const range = rows.length ? `${number.format(offset + 1)}–${number.format(offset + rows.length)}` : '0';
    const count = page.total === null ? `Resultados: ${range}` : `${range} de ${number.format(page.total)}${page.capped ? '+' : ''}`;
    const canNext = page.hasMore && !blocked && !pending;
    const captionId = React.useId();

    return (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            {toolbar}
            <div role="status" className="sr-only">{!refreshing && !pending && !blocked && !error ? count : ''}</div>
            {error && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                <span>{error}</span><Button type="button" variant="outline" onClick={retry}>Reintentar</Button>
            </div>}
            <div aria-busy={pending || refreshing}>
                <div className="h-0.5 bg-slate-100" aria-hidden="true">
                    {refreshing && <div className="h-full bg-blue-500 motion-safe:animate-pulse" />}
                </div>
                <div className="hidden overflow-x-auto md:block" role="region" aria-labelledby={captionId} tabIndex={0}>
                    <table className="w-full text-left text-sm text-slate-700">
                        <caption id={captionId} className="sr-only">{title}</caption>
                        <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-700">
                            <tr>{columns.map(({ id, header, sortKey, hideBelow, className }) => {
                                const direction = sortKey === sort.key ? sort.direction : undefined;
                                const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
                                return <th key={id} scope="col" aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                                    className={`${hideBelow ? hideClasses[hideBelow] : ''} ${className ?? ''} ${sortKey ? '' : 'px-3 py-3'}`}>
                                    {sortKey ? <button type="button" onClick={() => onSort(sortKey)} className="flex min-h-10 w-full items-center gap-1.5 whitespace-nowrap px-3 text-left hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                                        {header}<Icon aria-hidden="true" size={13} className={direction ? 'text-blue-700' : 'text-slate-500'} />
                                    </button> : header}
                                </th>;
                            })}</tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 ${refreshing ? 'opacity-70' : ''}`}>
                            {pending ? Array.from({ length: 6 }, (_, i) => <tr key={i} aria-hidden="true" className="h-20 motion-safe:animate-pulse">
                                {columns.map(col => <td key={col.id} className={`px-3 ${col.hideBelow ? hideClasses[col.hideBelow] : ''}`}><div className="h-3 w-2/3 rounded bg-slate-100" /></td>)}
                            </tr>) : rows.map(row => <tr key={row.id} className="h-20 hover:bg-slate-50">
                                {columns.map(col => <td key={col.id} className={`px-3 py-3 ${col.hideBelow ? hideClasses[col.hideBelow] : ''} ${col.className ?? ''}`}>{col.cell(row, blocked)}</td>)}
                            </tr>)}
                        </tbody>
                    </table>
                </div>
                <ul role="list" aria-label={title} className={`divide-y divide-slate-100 md:hidden ${refreshing ? 'opacity-70' : ''}`}>
                    {pending ? Array.from({ length: 5 }, (_, i) => <li key={i} aria-hidden="true" className="h-36 space-y-4 p-4 motion-safe:animate-pulse"><div className="h-3 w-1/2 rounded bg-slate-100" /><div className="h-3 w-3/4 rounded bg-slate-100" /></li>)
                        : rows.map(row => <li key={row.id} className="p-4">{renderMobileCard(row, blocked)}</li>)}
                </ul>
                {!pending && !error && rows.length === 0 && empty && <div className={refreshing ? 'opacity-70' : undefined}>{empty}</div>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <span className="tabular-nums">Página {page.index + 1}{!pending && !blocked && ` · ${count}`}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex items-center gap-2">Filas
                        <select value={page.size} onChange={event => {
                            const size = pageSizes.find(value => value === Number(event.currentTarget.value));
                            if (size) page.changeSize(size);
                        }} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 md:min-h-9">
                            {pageSizes.map(size => <option key={size}>{size}</option>)}
                        </select>
                    </label>
                    <nav className="flex gap-1" aria-label="Paginación">
                        <Button type="button" variant="outline" className={paginationButton} aria-disabled={page.index === 0 || blocked || pending}
                            onClick={() => { if (page.index > 0 && !blocked && !pending) page.change(page.index - 1); }}>
                            <ChevronLeft size={15} aria-hidden="true" />Anterior
                        </Button>
                        <Button type="button" variant="outline" className={paginationButton} aria-disabled={!canNext}
                            onMouseEnter={() => { if (canNext) page.prefetchNext(); }} onFocus={() => { if (canNext) page.prefetchNext(); }}
                            onClick={() => { if (canNext) page.change(page.index + 1); }}>
                            Siguiente<ChevronRight size={15} aria-hidden="true" />
                        </Button>
                    </nav>
                </div>
            </footer>
        </section>
    );
}
