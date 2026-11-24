import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, RotateCw, Trash2 } from 'lucide-react';
import { ApiError, isAuthError, useApi } from '../../../hooks/useApi';
import { updateTableUrl, useTableUrlState } from '../../../hooks/useTableUrlState';
import { localDateOf } from '../../../lib/agenda/time';
import { Button } from '../../ui/Button';
import { DataTable, pageSizes, type Column, type PageSize, type Sort } from '../../ui/data-table/DataTable';
import { TableToolbar, type FilterChip } from '../../ui/data-table/TableToolbar';

const stateLabels = { active: 'Vigente', expiring: 'Por vencer', expired: 'Sin vigencia', none: 'Sin membresía' };
type MembershipStatus = keyof typeof stateLabels;
const statuses: MembershipStatus[] = ['active', 'expiring', 'expired', 'none'];
const visitOptions = [
    { id: 'last_7d', label: 'En los últimos 7 días' },
    { id: 'last_30d', label: 'En los últimos 30 días' },
    { id: 'inactive_30d', label: 'Sin visitar en 30 días' },
    { id: 'inactive_60d', label: 'Sin visitar en 60 días' },
    { id: 'never', label: 'Nunca ha visitado' },
];
const sortOptions = [
    { id: 'code', label: 'ID' }, { id: 'full_name', label: 'Miembro' }, { id: 'status', label: 'Estado' },
    { id: 'coverage_until', label: 'Vence' }, { id: 'last_visit_at', label: 'Última visita' }, { id: 'joined_at', label: 'Fecha de alta' },
] as const;
type SortKey = (typeof sortOptions)[number]['id'];
const defaultSort: Sort<SortKey> = { key: 'joined_at', direction: 'desc' };
const maxOffset = 50_000;
const dateKey = /^\d{4}-\d{2}-\d{2}$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

interface MemberFilters {
    status: readonly MembershipStatus[];
    plan_id: readonly string[];
    last_visit: string;
    joined_from: string;
    joined_before: string;
}

const noFilters: MemberFilters = { status: [], plan_id: [], last_visit: '', joined_from: '', joined_before: '' };

export interface MemberRow {
    id: string;
    branch_id: string;
    code: number;
    role: string;
    is_coach?: boolean;
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string;
    memberships: string[];
    is_active: boolean;
    membership_status?: MembershipStatus;
    coverage_until?: string | null;
    last_visit_at?: string | null;
    plan_names_active?: string[];
}

interface MemberPage {
    items: MemberRow[];
    total: number | null;
    total_capped?: boolean;
    has_more?: boolean;
}

interface PlanOption { id: string; name: string }

function validDate(value: string) {
    if (!dateKey.test(value) || value.startsWith('0000')) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validRange({ joined_from, joined_before }: MemberFilters) {
    return (!joined_from || validDate(joined_from)) && (!joined_before || validDate(joined_before))
        && (!joined_from || !joined_before || joined_from < joined_before);
}

function sortValue(sort: Sort<SortKey>) {
    return `${sort.direction === 'desc' ? '-' : ''}${sort.key}`;
}

function parseSort(value: string | null): Sort<SortKey> {
    const key = sortOptions.find(({ id }) => id === value || `-${id}` === value)?.id;
    return key ? { key, direction: value?.startsWith('-') ? 'desc' : 'asc' } : defaultSort;
}

function readFilters(params: URLSearchParams): MemberFilters {
    const status = params.getAll('status');
    const last = params.get('last_visit');
    const from = params.get('joined_from') ?? '';
    const before = params.get('joined_before') ?? '';
    const result: MemberFilters = {
        status: statuses.filter(value => status.includes(value)).sort(),
        plan_id: [...new Set(params.getAll('plan_id').filter(value => uuid.test(value)).map(value => value.toLowerCase()))].sort(),
        last_visit: visitOptions.find(({ id }) => id === last)?.id ?? '',
        joined_from: validDate(from) ? from : '',
        joined_before: validDate(before) ? before : '',
    };
    return validRange(result) ? result : { ...result, joined_before: '' };
}

function writeFilters(filters: MemberFilters) {
    return {
        status: [...filters.status].sort(), plan_id: [...filters.plan_id].sort(),
        last_visit: filters.last_visit || null, joined_from: filters.joined_from || null, joined_before: filters.joined_before || null,
    };
}

function toggle<T>(values: readonly T[], value: T) {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

const fieldClass = 'min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800';

function MemberFilterFields({ filters, change, plans, plansError, plansLoading }: {
    filters: MemberFilters; change: (value: MemberFilters) => void; plans: readonly PlanOption[]; plansError: boolean; plansLoading: boolean;
}) {
    return <>
        <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-semibold text-slate-900">Estado</legend>
            <div className="grid grid-cols-2 gap-x-2">
                {statuses.map(status => <label key={status} className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={filters.status.includes(status)} onChange={() => change({ ...filters, status: toggle(filters.status, status) })} />{stateLabels[status]}
                </label>)}
            </div>
        </fieldset>
        <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Plan vigente</legend>
            {plans.length ? <div className="max-h-44 overflow-y-auto">{plans.map(plan => <label key={plan.id} className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={filters.plan_id.includes(plan.id)} onChange={() => change({ ...filters, plan_id: toggle(filters.plan_id, plan.id) })} />{plan.name}
            </label>)}</div> : <p className="mt-1 text-sm text-slate-600">{plansLoading ? 'Cargando planes…' : plansError ? 'No pudimos cargar los planes.' : 'No hay planes disponibles.'}</p>}
        </fieldset>
        <label className="block space-y-1 text-sm font-semibold text-slate-900">Última visita
            <select value={filters.last_visit} onChange={event => change({ ...filters, last_visit: event.currentTarget.value })} className={fieldClass}>
                <option value="">Cualquier fecha</option>{visitOptions.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
        </label>
        <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">Fecha de alta</legend>
            <label className="block space-y-1 text-sm text-slate-700">Desde
                <input type="date" value={filters.joined_from} onChange={event => change({ ...filters, joined_from: event.currentTarget.value })} className={fieldClass} />
            </label>
            <label className="block space-y-1 text-sm text-slate-700">Antes de
                <input type="date" value={filters.joined_before} onChange={event => change({ ...filters, joined_before: event.currentTarget.value })} className={fieldClass} />
            </label>
            {!validRange(filters) && <p className="text-sm text-rose-700" role="status">La fecha «Antes de» debe ser posterior a «Desde».</p>}
        </fieldset>
    </>;
}

const badgeColors = {
    active: 'bg-emerald-50 text-emerald-800', expiring: 'bg-amber-50 text-amber-900',
    expired: 'bg-rose-50 text-rose-800', none: 'bg-slate-100 text-slate-700',
};
const relative = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });
const actionClass = 'grid min-h-11 min-w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 md:min-h-8 md:min-w-8';

interface MemberDirectoryProps {
    title: string;
    branchId: string;
    timezone?: string;
    onNew: () => void;
    onOpen: (member: MemberRow) => void;
    onEdit: (member: MemberRow) => void;
    onDelete: (id: string) => void;
}

export function MemberDirectory({ title, branchId, timezone = 'America/Mexico_City', onNew, onOpen, onEdit, onDelete }: MemberDirectoryProps) {
    const { apiCall } = useApi();
    const client = useQueryClient();
    const params = useTableUrlState();
    const [draft, setDraft] = useState('');
    const [q, setQuery] = useState('');
    const [composing, setComposing] = useState(false);
    const [searchPage, setSearchPage] = useState(0);
    const normalizedDraft = draft.trim();
    const typing = normalizedDraft !== q;
    const filters = readFilters(params);
    const sort = parseSort(params.get('sort'));
    const limit = pageSizes.find(size => size === Number(params.get('limit'))) ?? 25;
    const requestedPage = Number(params.get('page'));
    const urlPage = Number.isInteger(requestedPage) && requestedPage > 0 && (requestedPage - 1) * limit <= maxOffset ? requestedPage - 1 : 0;
    const page = q ? searchPage : urlPage;
    const offset = page * limit;

    const submitSearch = useCallback((value: string) => {
        const term = value.trim();
        if (term === q) return;
        setQuery(term);
        setSearchPage(0);
    }, [q]);

    useEffect(() => {
        if (composing || !typing) return;
        const timer = window.setTimeout(() => submitSearch(draft), 300);
        return () => window.clearTimeout(timer);
    }, [composing, draft, submitSearch, typing]);

    useEffect(() => {
        function resetSearch() {
            setDraft('');
            setQuery('');
            setSearchPage(0);
        }
        window.addEventListener('popstate', resetSearch);
        return () => window.removeEventListener('popstate', resetSearch);
    }, []);

    function memberQuery(start: number) {
        return queryOptions({
            queryKey: ['table', 'member', branchId, { filters, q, sort: sortValue(sort), offset: start, limit }],
            queryFn: ({ signal }) => {
                const search = new URLSearchParams({ branch_id: branchId, q, search: q, sort: sortValue(sort),
                    offset: String(start), skip: String(start), limit: String(limit) });
                for (const [key, value] of Object.entries(writeFilters(filters))) {
                    if (typeof value === 'string') search.set(key, value);
                    else value?.forEach(item => search.append(key, item));
                }
                return apiCall<MemberPage>(`/api/v1/members?${search}`, { signal });
            },
            staleTime: 30_000,
        });
    }

    const result = useQuery({
        ...memberQuery(offset),
        placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === branchId ? previous : undefined,
        refetchOnWindowFocus: query => !isAuthError(query.state.error),
    });
    const plansQuery = useQuery({
        queryKey: ['membership-plans', branchId],
        queryFn: ({ signal }) => apiCall<PlanOption[]>(`/api/v1/membership-plans?${new URLSearchParams({ branch_id: branchId })}`, { signal }),
    });
    const plans = plansQuery.data ?? [];
    const rows = result.data?.items ?? [];
    const total = result.data?.total ?? null;
    const hasMore = offset + limit <= maxOffset && (result.data?.has_more ?? (total !== null ? offset + rows.length < total : rows.length === limit));
    const authError = isAuthError(result.error);
    const blocked = result.isPlaceholderData || typing || authError;
    const refreshing = result.isFetching || typing;

    function applyFilters(next: MemberFilters) {
        setSearchPage(0);
        updateTableUrl({ ...writeFilters(next), page: null });
    }

    function applySort(next: Sort<SortKey>) {
        setSearchPage(0);
        updateTableUrl({ sort: sortValue(next) === sortValue(defaultSort) ? null : sortValue(next), page: null });
    }

    function cycleSort(key: SortKey) {
        const explicit = params.has('sort');
        applySort(!explicit || sort.key !== key ? { key, direction: 'asc' }
            : sort.direction === 'asc' ? { key, direction: 'desc' } : defaultSort);
    }

    function changePage(index: number) {
        if (q) setSearchPage(index);
        else updateTableUrl({ page: index ? String(index + 1) : null });
    }

    function changeSize(size: PageSize) {
        setSearchPage(0);
        updateTableUrl({ limit: size === 25 ? null : String(size), page: null });
    }

    const chips: FilterChip[] = [
        ...filters.status.map(status => ({ id: status, label: stateLabels[status], remove: () => applyFilters({ ...filters, status: toggle(filters.status, status) }) })),
        ...filters.plan_id.map(id => ({ id, label: `Plan: ${plans.find(plan => plan.id === id)?.name ?? 'seleccionado'}`, remove: () => applyFilters({ ...filters, plan_id: toggle(filters.plan_id, id) }) })),
    ];
    if (filters.last_visit) chips.push({ id: 'last_visit', label: visitOptions.find(option => option.id === filters.last_visit)?.label ?? '', remove: () => applyFilters({ ...filters, last_visit: '' }) });
    if (filters.joined_from) chips.push({ id: 'joined_from', label: `Alta desde ${filters.joined_from}`, remove: () => applyFilters({ ...filters, joined_from: '' }) });
    if (filters.joined_before) chips.push({ id: 'joined_before', label: `Alta antes de ${filters.joined_before}`, remove: () => applyFilters({ ...filters, joined_before: '' }) });

    const presets: { label: string; status: MembershipStatus[] }[] = [
        { label: 'Todos', status: [] }, { label: 'Vigentes', status: ['active', 'expiring'] },
        { label: 'Por vencer', status: ['expiring'] }, { label: 'Sin vigencia', status: ['expired'] },
    ];

    const dateFormat = useMemo(() => new Intl.DateTimeFormat('es-MX', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric',
    }), [timezone]);
    const today = localDateOf(new Date().toISOString(), timezone);
    function calendarDays(iso: string) {
        const date = localDateOf(iso, timezone);
        return (Date.parse(date) - Date.parse(today)) / 86_400_000;
    }

    function coverage(row: MemberRow) {
        return row.coverage_until ? <time dateTime={row.coverage_until}>{dateFormat.format(new Date(row.coverage_until))}</time> : '—';
    }

    function lastVisit(row: MemberRow) {
        return row.last_visit_at ? <time dateTime={row.last_visit_at} title={dateFormat.format(new Date(row.last_visit_at))}>
            {relative.format(calendarDays(row.last_visit_at), 'day')}
        </time> : row.last_visit_at === null ? 'Nunca' : '—';
    }

    function statusBadge(row: MemberRow) {
        const status = row.membership_status;
        const text = status ? stateLabels[status] : 'Sin confirmar';
        const days = status === 'expiring' && row.coverage_until ? Math.max(0, calendarDays(row.coverage_until)) : null;
        return <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${status ? badgeColors[status] : badgeColors.none}`}>
            {text}{days === null ? '' : days === 0 ? ' · hoy' : ` · ${days} ${days === 1 ? 'día' : 'días'}`}
        </span>;
    }

    function nameButton(row: MemberRow, disabled: boolean) {
        return <button type="button" disabled={disabled} onClick={() => onOpen(row)}
            className="min-h-11 break-words text-left font-semibold text-slate-900 hover:text-blue-700 hover:underline md:min-h-0">{row.full_name}</button>;
    }

    function actions(row: MemberRow, disabled: boolean) {
        return <div className="flex justify-end gap-1">
            <button type="button" disabled={disabled} aria-label={`Editar a ${row.full_name}`} onClick={() => onEdit(row)} className={actionClass}><Edit2 size={16} aria-hidden="true" /></button>
            <button type="button" disabled={disabled} aria-label={`Renovar membresía de ${row.full_name}`} onClick={() => onOpen(row)} className={actionClass}><RotateCw size={16} aria-hidden="true" /></button>
            <button type="button" disabled={disabled} aria-label={`Eliminar a ${row.full_name}`} onClick={() => onDelete(row.id)} className={`${actionClass} hover:!text-rose-800`}><Trash2 size={16} aria-hidden="true" /></button>
        </div>;
    }

    const columns: Column<MemberRow, SortKey>[] = [
        { id: 'code', header: 'ID', sortKey: 'code', cell: row => <span className="font-mono font-semibold">#{row.code}</span> },
        { id: 'name', header: 'Miembro', sortKey: 'full_name', className: 'min-w-36 max-w-60', cell: (row, disabled) => <>
            {nameButton(row, disabled)}<div className="break-all text-xs text-slate-600">{row.email}</div>
            {row.phone && <div className="text-xs text-slate-600">{row.phone}</div>}
        </> },
        { id: 'status', header: 'Estado', sortKey: 'status', cell: statusBadge },
        { id: 'plans', header: 'Planes vigentes', hideBelow: 'lg', cell: row => row.plan_names_active?.join(', ') || '—' },
        { id: 'coverage', header: 'Vence', sortKey: 'coverage_until', cell: coverage },
        { id: 'visit', header: 'Última visita', sortKey: 'last_visit_at', hideBelow: 'lg', cell: lastVisit },
        { id: 'actions', header: 'Acciones', className: 'text-right', cell: actions },
    ];

    const newButton = <Button type="button" onClick={onNew} className="!min-h-11 !gap-1.5 !px-3"><Plus aria-hidden="true" size={17} />Nuevo miembro</Button>;
    const hasCriteria = Boolean(q || chips.length);
    const toolbar = <>
        <TableToolbar title={title} search={{ value: draft, placeholder: 'Nombre, correo, teléfono o ID', pending: typing || (Boolean(q) && result.isFetching),
            change: setDraft, submit: submitSearch, compose: setComposing }}
            filters={filters} validateDraft={validRange} chips={chips} applyFilters={applyFilters} clearFilters={() => applyFilters(noFilters)}
            renderFilters={(draftFilters, change) => <MemberFilterFields filters={draftFilters} change={change} plans={plans} plansError={plansQuery.isError} plansLoading={plansQuery.isPending} />}
            action={newButton} presets={presets.map(preset => {
                const selected = preset.status.length === filters.status.length && preset.status.every(status => filters.status.includes(status));
                return <button key={preset.label} type="button" aria-pressed={selected} onClick={() => applyFilters({ ...filters, status: preset.status })}
                    className={`min-h-11 rounded-md px-2.5 text-xs font-semibold md:min-h-8 ${selected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{preset.label}</button>;
            })} mobileSort={<label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-slate-700 md:hidden">Orden
                <select value={sortValue(sort)} className={fieldClass} onChange={event => applySort(parseSort(event.currentTarget.value))}>
                    {sortOptions.flatMap(({ id, label }) => [<option key={id} value={id}>{label} ↑</option>, <option key={`-${id}`} value={`-${id}`}>{label} ↓</option>])}
                </select>
            </label>} />
        {sort.key === 'joined_at' && <p className="hidden px-5 pb-3 text-xs text-slate-600 md:block">
            Orden: Fecha de alta · {sort.direction === 'asc' ? 'más antiguas primero' : 'más recientes primero'}
        </p>}
        {!!result.data && result.data.has_more === undefined && (chips.length > 0 || params.has('sort')) &&
            <p className="px-4 pb-3 text-sm text-slate-600" role="status">Los filtros y el orden aún no están disponibles en este servidor.</p>}
    </>;

    return <DataTable title={title} columns={columns} rows={rows} toolbar={toolbar} sort={sort} onSort={cycleSort}
        renderMobileCard={(row, disabled) => <>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0">{nameButton(row, disabled)}<div className="font-mono text-xs text-slate-600">#{row.code}</div></div>{actions(row, disabled)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">{statusBadge(row)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div><dt className="font-semibold">Vence</dt><dd>{coverage(row)}</dd></div>
                <div><dt className="font-semibold">Última visita</dt><dd>{lastVisit(row)}</dd></div>
            </dl>
        </>}
        page={{ index: page, size: limit, total, capped: result.data?.total_capped ?? false, hasMore, change: changePage, changeSize,
            prefetchNext: () => { if (!result.isFetching) void client.prefetchQuery(memberQuery(offset + limit)); } }}
        pending={result.isPending} refreshing={!result.isPending && refreshing} blocked={blocked}
        error={result.isError && !authError ? result.error instanceof ApiError && result.error.status === 422
            ? 'Revisa la búsqueda (hasta 8 términos) y los filtros.'
            : result.data ? 'No pudimos actualizar los resultados.' : 'No pudimos cargar los miembros.' : undefined}
        retry={() => void result.refetch()} empty={!authError && <div className="space-y-3 px-4 py-12 text-center text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{page > 0 ? 'No hay resultados en esta página' : hasCriteria ? 'Sin coincidencias' : 'Aún no hay miembros'}</p>
            <div className="flex flex-wrap justify-center gap-2">
                {page > 0 ? <Button type="button" variant="outline" onClick={() => changePage(0)}>Volver a la primera página</Button> : hasCriteria ? <>
                    {chips.length > 0 && <Button type="button" variant="outline" onClick={() => applyFilters(noFilters)}>Quitar filtros</Button>}
                    {q && <Button type="button" variant="outline" onClick={() => { setDraft(''); submitSearch(''); }}>Borrar búsqueda</Button>}
                </> : newButton}
            </div>
        </div>} />;
}
