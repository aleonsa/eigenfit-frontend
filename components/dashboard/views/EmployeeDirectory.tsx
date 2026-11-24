import React, { useId, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Mail, Trash2 } from 'lucide-react';
import { isAuthError, useApi } from '../../../hooks/useApi';
import { Button } from '../../ui/Button';
import { DataTable, type Column, type Sort } from '../../ui/data-table/DataTable';
import { MobileTableSort, TableToolbar } from '../../ui/data-table/TableToolbar';
import { sortParam, useListControls } from '../../ui/data-table/useListControls';
import type { MemberRow } from './MemberDirectory';

const sortOptions = [{ id: 'code', label: 'ID' }, { id: 'full_name', label: 'Nombre' }, { id: 'joined_at', label: 'Fecha de alta' }] as const;
type SortKey = (typeof sortOptions)[number]['id'];
const defaultSort: Sort<SortKey> = { key: 'joined_at', direction: 'desc' };
const actionClass = 'grid min-h-11 min-w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-50 md:min-h-8 md:min-w-8';

interface EmployeePage { items: MemberRow[]; total: number | null; has_more?: boolean; total_capped?: boolean }

interface EmployeeDirectoryProps {
    title: string;
    branchId: string;
    timezone?: string;
    onNew: () => void;
    onEdit: (row: MemberRow) => void;
    onInvite: (row: MemberRow) => void;
    onDelete: (id: string) => void;
}

export function EmployeeDirectory({ title, branchId, timezone = 'America/Mexico_City', onNew, onEdit, onInvite, onDelete }: EmployeeDirectoryProps) {
    const { apiCall } = useApi();
    const coachId = useId();
    const controls = useListControls(sortOptions.map(option => option.id), defaultSort);
    const { params, q, typing, page, limit, offset, sort } = controls;
    const selectedCoach = params.get('coach');
    const coach = selectedCoach === 'true' || selectedCoach === 'false' ? selectedCoach : '';
    const result = useQuery({
        queryKey: ['table', 'employee', branchId, { q, sort: sortParam(sort), coach, offset, limit }],
        queryFn: ({ signal }) => {
            const request = new URLSearchParams({ branch_id: branchId, q, search: q, sort: sortParam(sort),
                offset: String(offset), skip: String(offset), limit: String(limit) });
            if (coach) request.set('is_coach', coach);
            return apiCall<EmployeePage>(`/api/v1/employees?${request}`, { signal });
        },
        placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === branchId ? previous : undefined,
    });
    const rows = result.data?.items ?? [];
    const total = result.data?.total ?? null;
    const hasMore = controls.canAdvance && (result.data?.has_more ?? (total !== null && offset + rows.length < total));
    const unsupportedControls = result.data && !result.isPlaceholderData && (
        (result.data.has_more === undefined && (coach || params.has('sort')))
        || (coach && rows.some(row => Boolean(row.is_coach) !== (coach === 'true')))
    );
    const authError = isAuthError(result.error);
    const blocked = result.isPlaceholderData || typing || authError;
    const create = <Button type="button" className="!min-h-11 !px-3" onClick={onNew}>Nuevo Empleado</Button>;
    const dateFormat = useMemo(() => new Intl.DateTimeFormat('es-MX', { timeZone: timezone, dateStyle: 'medium' }), [timezone]);

    function coachBadge(row: MemberRow) {
        return row.is_coach ? <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Coach</span> : 'No';
    }

    function actions(row: MemberRow, disabled: boolean) {
        return <div className="flex justify-end gap-1">
            <button type="button" disabled={disabled} onClick={() => onEdit(row)} aria-label={`Editar a ${row.full_name}`} className={actionClass}><Edit2 size={15} aria-hidden="true" /></button>
            <button type="button" disabled={disabled} onClick={() => onInvite(row)} aria-label={`Invitar a ${row.full_name}`} className={actionClass}><Mail size={15} aria-hidden="true" /></button>
            <button type="button" disabled={disabled} onClick={() => onDelete(row.id)} aria-label={`Eliminar a ${row.full_name}`} className={actionClass}><Trash2 size={15} aria-hidden="true" /></button>
        </div>;
    }

    const columns: Column<MemberRow, SortKey>[] = [
        { id: 'code', header: 'ID', sortKey: 'code', cell: row => <span className="font-mono font-semibold">E-{row.code}</span> },
        { id: 'name', header: 'Nombre', sortKey: 'full_name', cell: row => <span className="font-medium text-slate-900">{row.full_name}</span> },
        { id: 'email', header: 'Correo', cell: row => <span className="break-all">{row.email}</span> },
        { id: 'coach', header: 'Da clases', cell: coachBadge },
        { id: 'joined', header: 'Fecha de alta', sortKey: 'joined_at', cell: row => row.created_at ? dateFormat.format(new Date(row.created_at)) : '—' },
        { id: 'state', header: 'Estado', cell: row => row.is_active ? 'Activo' : 'Inactivo' },
        { id: 'actions', header: 'Acciones', className: 'text-right', cell: actions },
    ];

    return <DataTable title={title} columns={columns} rows={rows} sort={sort} onSort={controls.cycleSort}
        toolbar={<><TableToolbar title={title} action={create} search={{ ...controls.search, placeholder: 'Buscar empleado…', pending: typing || (!!q && result.isFetching) }}
            presets={<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <label htmlFor={coachId}>Coach</label>
                <select id={coachId} value={coach} onChange={event => controls.criteria({ coach: event.currentTarget.value || null })}
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-2 md:min-h-9">
                    <option value="">Todos</option><option value="true">Sí</option><option value="false">No</option>
                </select>
            </div>}
            mobileSort={<MobileTableSort value={sortParam(sort)} options={sortOptions} change={controls.setSort} />} />
            {unsupportedControls && <p className="px-4 pb-3 text-sm text-slate-600" role="status">El filtro y el orden aún no están disponibles en este servidor.</p>}
        </>}
        renderMobileCard={(row, disabled) => <>
            <p className="font-semibold text-slate-900">{row.full_name}</p>
            <div className="break-all text-sm text-slate-600">E-{row.code} · {row.email}</div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-sm"><span>{row.is_coach ? coachBadge(row) : 'Sin clases'} · {row.is_active ? 'Activo' : 'Inactivo'}</span>{actions(row, disabled)}</div>
        </>}
        page={{ index: page, size: limit, total, capped: result.data?.total_capped ?? false, hasMore, change: controls.changePage, changeSize: controls.changeSize }}
        pending={result.isPending} refreshing={!result.isPending && (result.isFetching || typing)} blocked={blocked}
        error={result.isError && !authError ? 'No pudimos cargar los empleados.' : undefined} retry={() => void result.refetch()}
        empty={!authError && <p className="px-4 py-12 text-center text-sm text-slate-600">{q || coach ? 'Sin coincidencias' : 'No hay empleados en esta página'}</p>} />;
}
