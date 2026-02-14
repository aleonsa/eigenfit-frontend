import React, { useState, useEffect, useCallback } from 'react';
import { DataTable, Column } from '../../ui/DataTable';
import { useApi } from '../../../hooks/useApi';

interface AttendanceRecord {
    id: string;
    branch_id: string;
    member_id: string;
    check_in_time: string;
    check_out_time: string | null;
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
    type: 'C' | 'E';
}

type TypeFilter = 'all' | 'C' | 'E';

interface HomeViewProps {
    branchId: string;
}

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
                ${row.type === 'E' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                {row.type}
            </span>
        )
    }
];

const filterButtons: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'C', label: 'Miembros' },
    { value: 'E', label: 'Empleados' },
];

export const HomeView: React.FC<HomeViewProps> = ({ branchId }) => {
    const { apiCall } = useApi();
    const [allRows, setAllRows] = useState<CheckInRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalMembers, setTotalMembers] = useState<number | null>(null);
    const [todayVisits, setTodayVisits] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const [attendances, membersPage, employeesPage] = await Promise.all([
                apiCall<AttendanceRecord[]>(`/api/v1/attendances?branch_id=${branchId}&attendance_date=${today}&limit=200`),
                apiCall<{ items: MemberRecord[]; total: number }>(`/api/v1/members?branch_id=${branchId}&limit=100`),
                apiCall<{ items: MemberRecord[]; total: number }>(`/api/v1/employees?branch_id=${branchId}&limit=100`),
            ]);

            const memberMap = new Map<string, MemberRecord>();
            membersPage.items.forEach(m => memberMap.set(m.id, m));
            employeesPage.items.forEach(m => memberMap.set(m.id, m));

            const checkInRows: CheckInRow[] = attendances.map(a => {
                const member = memberMap.get(a.member_id);
                const name = member?.full_name ?? 'Desconocido';
                const role = member?.role ?? 'member';
                const code = member?.code ?? 0;
                const isCheckedOut = !!a.check_out_time;
                return {
                    id: a.id,
                    displayCode: formatCode(code, role),
                    name,
                    initials: getInitials(name),
                    checkIn: formatTime(a.check_in_time),
                    checkOut: formatTime(a.check_out_time),
                    status: isCheckedOut ? 'Inactivo' : 'Activo',
                    type: role === 'employee' ? 'E' : 'C',
                };
            });

            setAllRows(checkInRows);
            setTodayVisits(attendances.length);
            setTotalMembers(membersPage.total);
        } catch (e) {
            console.error('Error fetching home data:', e);
        } finally {
            setLoading(false);
        }
    }, [branchId, apiCall]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredRows = typeFilter === 'all'
        ? allRows
        : allRows.filter(r => r.type === typeFilter);

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
                data={filteredRows}
                columns={columns}
                searchPlaceholder="Buscar por nombre..."
                loading={loading}
            />
        </div>
    );
};
