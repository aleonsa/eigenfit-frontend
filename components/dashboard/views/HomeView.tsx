import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataTable, Column } from '../../ui/DataTable';
import { useApi } from '../../../hooks/useApi';

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
    total: number;
}

interface MemberRecord {
    id: string;
    code: number;
    full_name: string;
    role: string;
}

interface CheckInRow {
    id: string;
    displayCode: string;
    name: string;
    initials: string;
    checkIn: string;
    checkOut: string;
    status: 'Activo' | 'Inactivo';
    type: 'M' | 'E';
}

type TypeFilter = 'all' | 'M' | 'E';

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
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getInitials = (name: string): string =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatCode = (code: number, role: string): string =>
    role === 'employee' ? `E-${code}` : String(code);

const columns: Column<CheckInRow>[] = [
    {
        header: 'ID',
        cell: (row) => (
            <span className="font-mono font-semibold text-slate-700">{row.displayCode}</span>
        ),
        className: 'w-20'
    },
    {
        header: 'Nombre',
        cell: (row) => (
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white
                    ${row.status === 'Activo' ? 'bg-green-500' : 'bg-slate-400'}`}>
                    {row.initials}
                </div>
                <span className="font-medium text-slate-900">{row.name}</span>
            </div>
        )
    },
    { header: 'Entrada', accessorKey: 'checkIn' },
    { header: 'Salida', accessorKey: 'checkOut' },
    {
        header: 'Estado',
        cell: (row) => (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                ${row.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {row.status}
            </span>
        )
    },
    {
        header: 'Tipo',
        cell: (row) => (
            <span className={`inline-flex w-6 h-6 items-center justify-center rounded text-xs font-bold
                ${row.type === 'E' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {row.type}
            </span>
        )
    }
];

const filterButtons: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'M', label: 'Miembros' },
    { value: 'E', label: 'Empleados' },
];

const PAGE_SIZE = 20;

export const HomeView: React.FC<HomeViewProps> = ({ branchId }) => {
    const { apiCall } = useApi();
    const [page, setPage] = useState(0);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    useEffect(() => {
        setPage(0);
    }, [typeFilter]);

    const todayInMexico = getMexicoDateParam();
    const role = typeFilter === 'E' ? 'employee' : typeFilter === 'M' ? 'member' : 'all';

    const { data, isLoading: loading } = useQuery({
        queryKey: ['home', branchId, todayInMexico, page, typeFilter],
        queryFn: async () => {
            const skip = page * PAGE_SIZE;
            const [attendancesPage, totalAttendancesPage, membersPage] = await Promise.all([
                apiCall<AttendancePage>(`/api/v1/attendances/page?branch_id=${branchId}&attendance_date=${todayInMexico}&role=${role}&skip=${skip}&limit=${PAGE_SIZE}`),
                apiCall<AttendancePage>(`/api/v1/attendances/page?branch_id=${branchId}&attendance_date=${todayInMexico}&role=all&skip=0&limit=1`),
                apiCall<{ items: MemberRecord[]; total: number }>(`/api/v1/members?branch_id=${branchId}&limit=1`),
            ]);

            const rows: CheckInRow[] = attendancesPage.items.map(a => {
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
                    displayCode: formatCode(code, memberRole),
                    name,
                    initials: getInitials(name),
                    checkIn: formatTime(a.check_in_time),
                    checkOut: formatTime(a.check_out_time),
                    status,
                    type: memberRole === 'employee' ? 'E' : 'M',
                };
            });

            return {
                rows,
                tableTotal: attendancesPage.total,
                todayVisits: totalAttendancesPage.total,
                totalMembers: membersPage.total,
            };
        },
        placeholderData: keepPreviousData,
    });

    const allRows = data?.rows ?? [];
    const tableTotal = data?.tableTotal ?? 0;
    const todayVisits = data?.todayVisits ?? null;
    const totalMembers = data?.totalMembers ?? null;

    return (
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

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100 w-fit shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                {filterButtons.map(btn => (
                    <button
                        key={btn.value}
                        onClick={() => setTypeFilter(btn.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            typeFilter === btn.value
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Today's Activity Table */}
            <DataTable
                title="Actividad de Hoy"
                data={allRows}
                columns={columns}
                searchPlaceholder="Buscar por nombre..."
                loading={loading}
                pagination={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalItems: tableTotal,
                    onPageChange: setPage,
                }}
            />
        </div>
    );
};
