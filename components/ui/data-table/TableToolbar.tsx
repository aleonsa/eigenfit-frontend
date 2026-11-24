import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../Button';
import { Drawer } from '../Drawer';

export interface FilterChip {
    id: string;
    label: string;
    remove: () => void;
}

interface TableToolbarProps<F> {
    title: string;
    search: { value: string; placeholder: string; pending: boolean; change: (value: string) => void;
        submit: (value: string) => void; compose: (composing: boolean) => void };
    filters: F;
    chips: readonly FilterChip[];
    applyFilters: (filters: F) => void;
    clearFilters: () => void;
    renderFilters: (draft: F, updateDraft: (draft: F) => void) => React.ReactNode;
    validateDraft: (draft: F) => boolean;
    action: React.ReactNode;
    presets: React.ReactNode;
    mobileSort: React.ReactNode;
}

export function TableToolbar<F>({ title, search, filters, chips, applyFilters, clearFilters, renderFilters,
    validateDraft, action, presets, mobileSort }: TableToolbarProps<F>) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const composing = useRef(false);
    const [editor, setEditor] = useState<{ draft: F } | null>(null);

    useEffect(() => {
        function focusSearch(event: KeyboardEvent) {
            if (event.defaultPrevented || event.isComposing || event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey
                || (event.target instanceof Element && (event.target.closest('input, textarea, select, [role="dialog"], dialog[open]')
                    || (event.target instanceof HTMLElement && event.target.isContentEditable)))
                || document.querySelector('[aria-modal="true"], dialog[open]')) return;
            event.preventDefault();
            input.current?.focus();
        }
        window.addEventListener('keydown', focusSearch);
        const closeFilters = () => setEditor(null);
        window.addEventListener('popstate', closeFilters);
        return () => {
            window.removeEventListener('keydown', focusSearch);
            window.removeEventListener('popstate', closeFilters);
        };
    }, []);

    return <>
        <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {action}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <form role="search" className="relative min-w-0 flex-1 basis-full sm:basis-52" onSubmit={event => {
                    event.preventDefault();
                    if (!composing.current) search.submit(search.value);
                }}>
                    <label htmlFor={id} className="sr-only">Buscar {title.toLowerCase()}</label>
                    <Search aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-slate-500" />
                    <input ref={input} id={id} value={search.value} onChange={event => search.change(event.currentTarget.value)}
                        autoComplete="off" maxLength={120} aria-keyshortcuts="/" placeholder={search.placeholder}
                        onCompositionStart={() => { composing.current = true; search.compose(true); }}
                        onCompositionEnd={event => { composing.current = false; search.change(event.currentTarget.value); search.compose(false); }}
                        onKeyDown={event => { if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing)) event.preventDefault(); }}
                        className={`min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${search.value || search.pending ? 'pr-20' : 'pr-3 sm:pr-10'}`} />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1">
                        {search.pending && <LoaderCircle aria-hidden="true" size={15} className="text-blue-700 motion-safe:animate-spin" />}
                        {search.value ? <button type="button" aria-label="Borrar búsqueda" onClick={() => { search.change(''); search.submit(''); input.current?.focus(); }}
                            className="grid min-h-11 min-w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-50"><X aria-hidden="true" size={16} /></button>
                            : <kbd aria-hidden="true" className="hidden rounded border border-slate-200 px-1.5 text-xs text-slate-500 sm:inline">/</kbd>}
                    </div>
                </form>
                <Button type="button" variant="outline" className="!min-h-11 !gap-2 !px-3" aria-haspopup="dialog" onClick={() => setEditor({ draft: filters })}>
                    <SlidersHorizontal size={16} aria-hidden="true" />{chips.length ? `Filtros (${chips.length})` : 'Filtros'}
                </Button>
                {mobileSort}
            </div>
            <div role="group" aria-label="Filtros rápidos" className="flex flex-wrap gap-1">{presets}</div>
            {chips.length > 0 && <div aria-label="Filtros aplicados" role="group" className="flex flex-wrap items-center gap-2">
                {chips.map(chip => <button key={chip.id} type="button" onClick={chip.remove} aria-label={`Quitar filtro: ${chip.label}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 md:min-h-8">
                    {chip.label}<X size={14} aria-hidden="true" className="shrink-0" />
                </button>)}
                <button type="button" onClick={clearFilters} className="min-h-11 px-2 text-sm font-medium text-blue-700 hover:underline md:min-h-8">Limpiar filtros</button>
            </div>}
        </div>
        {editor && <Drawer isOpen onClose={() => setEditor(null)} title="Filtros" subtitle={`Ajusta los resultados de ${title.toLowerCase()}.`}>
            <form className="space-y-5" onSubmit={event => {
                event.preventDefault();
                if (!validateDraft(editor.draft)) return;
                applyFilters(editor.draft);
                setEditor(null);
            }}>
                {renderFilters(editor.draft, draft => setEditor({ draft }))}
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditor(null)}>Cancelar</Button>
                    <Button type="submit" disabled={!validateDraft(editor.draft)}>Aplicar filtros</Button>
                </div>
            </form>
        </Drawer>}
    </>;
}
