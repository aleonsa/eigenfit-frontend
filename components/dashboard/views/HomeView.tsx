import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column, type Sort } from '../../ui/data-table/DataTable';
import { MobileTableSort, TableToolbar } from '../../ui/data-table/TableToolbar';
import { sortParam, useListControls } from '../../ui/data-table/useListControls';
import { isAuthError, useApi } from '../../../hooks/useApi';
import { MemberDetailDrawer } from './MemberDetailDrawer';

interface AttendanceRecord {
    id: string;
    branch_id: string;
    member_id: string;
    check_in_time: string;
    check_out_time: string | null;
    member_name: string | null;
    member_code: number | null;
    member_role: string | null;
    member_has_active_membership: boolean | null;
}

interface AttendancePage {
    items: AttendanceRecord[];
    total: number | null;
    total_capped?: boolean;
    has_more?: boolean;
}

interface Member {
    id: string;
    branch_id: string;
    code: number;
    role: string;
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string;
    memberships: string[];
    is_active: boolean;
    last_payment_date: string | null;
    due_date: string | null;
}

interface CheckInRow {
    id: string;
    member_id: string;
    displayCode: string;
    name: string;
    initials: string;
    checkIn: string;
    checkOut: string;
    status: 'Activo' | 'Inactivo';
    type: 'M' | 'E';
}

interface HomeViewProps {
    branchId: string;
}

const MEXICO_CITY_TIMEZONE = 'America/Mexico_City';

const mexicoDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MEXICO_CITY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const mexicoTimeFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_CITY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const getMexicoDateParam = (date = new Date()): string => {
    const parts = mexicoDatePartsFormatter.formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value ?? '0000';
    const month = parts.find(part => part.type === 'month')?.value ?? '01';
    const day = parts.find(part => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
};

const formatTime = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return mexicoTimeFormatter.format(d);
};

const getInitials = (name: string): string =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatCode = (code: number, role: string): string =>
    role === 'employee' ? `E-${code}` : String(code);


const filterButtons = [
    { value: 'all', label: 'Todos' },
    { value: 'member', label: 'Miembros' },
    { value: 'employee', label: 'Empleados' },
] as const;

const sortOptions = [{ id: 'check_in_time', label: 'Entrada' }, { id: 'member_name', label: 'Nombre' }] as const;
type SortKey = (typeof sortOptions)[number]['id'];
const defaultSort: Sort<SortKey> = { key: 'check_in_time', direction: 'desc' };

export const HomeView: React.FC<HomeViewProps> = ({ branchId }) => {
    const { apiCall } = useApi();
    const controls = useListControls(sortOptions.map(option => option.id), defaultSort);
    const { params, q, typing, page, limit, offset, sort } = controls;
    const role = filterButtons.find(button => button.value === params.get('role'))?.value ?? 'all';
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleRowClick = async (row: CheckInRow) => {
        if (row.type !== 'M') return;
        try {
            const member = await apiCall<Member>(`/api/v1/members/${row.member_id}`);
            setSelectedMember(member);
            setIsDrawerOpen(true);
        } catch (err) {
            console.error('Error fetching member:', err);
        }
    };

    function person(row: CheckInRow, blocked: boolean) {
        const content = <>
            <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${row.status === 'Activo' ? 'bg-green-500' : 'bg-slate-400'}`}>{row.initials}</span>
            <span className="break-words font-medium text-slate-900">{row.name}</span>
        </>;
        return row.type === 'M' ? <button type="button" disabled={blocked} onClick={() => void handleRowClick(row)}
            className="flex min-h-11 items-center gap-3 text-left enabled:hover:underline md:min-h-8">{content}</button>
            : <span className="flex items-center gap-3">{content}</span>;
    }

    function statusBadge(row: CheckInRow) {
        return row.type === 'M' && <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${row.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status}</span>;
    }

    const columns: Column<CheckInRow, SortKey>[] = [
        {
            id: 'code',
            header: 'ID',
            cell: (row) => (
                <span className="font-mono font-semibold text-slate-700">{row.displayCode}</span>
            ),
            className: 'w-20'
        },
        { id: 'name', header: 'Nombre', sortKey: 'member_name', cell: person },
        { id: 'checkIn', header: 'Entrada', sortKey: 'check_in_time', cell: row => row.checkIn },
        { id: 'checkOut', header: 'Salida', cell: row => row.checkOut },
        { id: 'status', header: 'Estado', cell: statusBadge },
        {
            id: 'type',
            header: 'Tipo',
            cell: (row) => (
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded text-xs font-bold
                    ${row.type === 'E' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {row.type}
                </span>
            )
        }
    ];

    const todayInMexico = getMexicoDateParam();
    const stats = useQuery({
        queryKey: ['home', branchId, todayInMexico, 'stats'],
        queryFn: async ({ signal }) => {
            const [visits, members] = await Promise.all([
                apiCall<AttendancePage>(`/api/v1/attendances/page?branch_id=${branchId}&attendance_date=${todayInMexico}&role=all&skip=0&limit=1`, { signal }),
                apiCall<{ total: number }>(`/api/v1/members?branch_id=${branchId}&limit=1`, { signal }),
            ]);
            return { todayVisits: visits.total, totalMembers: members.total };
        },
    });
    const result = useQuery({
        queryKey: ['home', branchId, todayInMexico, { role, q, sort: sortParam(sort), offset, limit }],
        queryFn: async ({ signal }) => {
            const request = new URLSearchParams({ branch_id: branchId, attendance_date: todayInMexico, role, q, sort: sortParam(sort),
                offset: String(offset), skip: String(offset), limit: String(limit) });
            const attendance = await apiCall<AttendancePage>(`/api/v1/attendances/page?${request}`, { signal });
            const rows: CheckInRow[] = attendance.items.map(a => {
                const name = a.member_name ?? 'Desconocido';
                const memberRole = a.member_role ?? 'member';
                const code = a.member_code ?? 0;
                const isCheckedOut = !!a.check_out_time;
                const hasActiveMembership = a.member_has_active_membership === true;
                const status: CheckInRow['status'] = memberRole === 'employee'
                    ? (isCheckedOut ? 'Inactivo' : 'Activo')
                    : (hasActiveMembership ? 'Activo' : 'Inactivo');
                return {
                    id: a.id,
                    member_id: a.member_id,
                    displayCode: formatCode(code, memberRole),
                    name,
                    initials: getInitials(name),
                    checkIn: formatTime(a.check_in_time),
                    checkOut: formatTime(a.check_out_time),
                    status,
                    type: memberRole === 'employee' ? 'E' : 'M',
                };
            });

            return { ...attendance, rows };
        },
        placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === branchId && previousQuery.queryKey[2] === todayInMexico ? previous : undefined,
    });

    const rows = result.data?.rows ?? [];
    const total = result.data?.total ?? null;
    const hasMore = controls.canAdvance && (result.data?.has_more ?? (total !== null && offset + rows.length < total));
    const legacySearch = result.data && !result.isPlaceholderData && result.data.has_more === undefined && (q || params.has('sort'));
    const authError = isAuthError(result.error);
    const todayVisits = stats.data?.todayVisits ?? null;
    const totalMembers = stats.data?.totalMembers ?? null;

    return (
        <>
        <MemberDetailDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            member={selectedMember}
        />
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                    { label: 'Miembros Registrados', value: totalMembers !== null ? totalMembers.toLocaleString() : '—', color: 'text-blue-600' },
                    { label: 'Visitas Hoy', value: todayVisits !== null ? String(todayVisits) : '—', color: 'text-slate-900' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                        <p className="text-sm font-medium text-slate-500 mb-2">{stat.label}</p>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                title="Actividad de Hoy"
                rows={rows}
                columns={columns}
                sort={sort}
                onSort={controls.cycleSort}
                toolbar={<><TableToolbar title="Actividad de Hoy" search={{ ...controls.search, placeholder: 'Buscar por nombre o código…', pending: typing || (!!q && result.isFetching) }}
                    presets={filterButtons.map(({ value, label }) => <button key={value} type="button" aria-pressed={role === value}
                        onClick={() => controls.criteria({ role: value === 'all' ? null : value })}
                        className={`min-h-11 rounded-md px-3 text-sm font-medium md:min-h-8 ${role === value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{label}</button>)}
                    mobileSort={<MobileTableSort value={sortParam(sort)} options={sortOptions} change={controls.setSort} />} />
                    {legacySearch && <p className="px-4 pb-3 text-sm text-slate-600" role="status">La búsqueda y el orden aún no están disponibles en este servidor.</p>}
                </>}
                renderMobileCard={(row, blocked) => <>
                    <div className="flex flex-wrap items-center justify-between gap-2">{person(row, blocked)}{statusBadge(row)}</div>
                    <p className="mt-2 text-xs text-slate-600">{row.displayCode} · {row.type === 'M' ? 'Miembro' : 'Empleado'}</p>
                    <p className="mt-2 text-sm">Entrada: {row.checkIn || '—'} · Salida: {row.checkOut || '—'}</p>
                </>}
                page={{ index: page, size: limit, total, capped: result.data?.total_capped ?? false, hasMore, change: controls.changePage, changeSize: controls.changeSize }}
                pending={result.isPending} refreshing={!result.isPending && (result.isFetching || typing)} blocked={result.isPlaceholderData || typing || authError}
                error={result.isError && !authError ? 'No pudimos cargar la actividad.' : undefined} retry={() => void result.refetch()}
                empty={!authError && <p className="px-4 py-12 text-center text-sm text-slate-600">{q || role !== 'all' ? 'Sin coincidencias' : 'No hay visitas en esta página'}</p>}
            />
        </div>
        </>
    );
};
