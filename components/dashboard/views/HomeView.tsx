import React from 'react';
import { DataTable, Column } from '../../ui/DataTable';

interface CheckInRecord {
    id: number;
    name: string;
    initials: string;
    checkIn: string;
    checkOut: string;
    status: 'Active' | 'Inactive';
    type: 'C' | 'E';
}

const recentActivityData: CheckInRecord[] = [
    { id: 310, name: 'Merle Berenice Gasco Sanchez', initials: 'M', checkIn: '19:26', checkOut: '', status: 'Inactive', type: 'C' },
    { id: 311, name: 'Regina Moncada Gazpo', initials: 'R', checkIn: '19:26', checkOut: '', status: 'Inactive', type: 'C' },
    { id: 312, name: 'Elizabeth Moncada Gasco', initials: 'E', checkIn: '19:26', checkOut: '', status: 'Inactive', type: 'C' },
    { id: 4, name: 'Andrea Romero', initials: 'A', checkIn: '16:37', checkOut: '19:25', status: 'Active', type: 'C' },
    { id: 789, name: 'Andres Baltazar', initials: 'A', checkIn: '19:19', checkOut: '', status: 'Active', type: 'C' },
];

const columns: Column<CheckInRecord>[] = [
    {
        header: 'ID',
        accessorKey: 'id',
        className: 'w-16'
    },
    {
        header: 'Name',
        cell: (row) => (
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white
                    ${row.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}>
                    {row.initials}
                </div>
                <span className="font-medium text-slate-900">{row.name}</span>
            </div>
        )
    },
    { header: 'Check In', accessorKey: 'checkIn' },
    { header: 'Check Out', accessorKey: 'checkOut' },
    {
        header: 'Status',
        cell: (row) => (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {row.status}
            </span>
        )
    },
    {
        header: 'Type',
        cell: (row) => (
            <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-blue-100 text-blue-700 text-xs font-bold">
                {row.type}
            </span>
        )
    }
];

export const HomeView: React.FC = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
                { label: 'Miembros Activos', value: '1,204', trend: '+12%', color: 'text-blue-600' },
                { label: 'Visitas Hoy', value: '86', trend: '+5%', color: 'text-slate-900' },
                { label: 'Ingresos (Mes)', value: '$42.5k', trend: '+8%', color: 'text-green-600' }
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                    <p className="text-sm font-medium text-slate-500 mb-2">{stat.label}</p>
                    <div className="flex items-baseline justify-between">
                        <span className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</span>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
                    </div>
                </div>
            ))}
        </div>

        {/* Recent Activity Table using DataTable */}
        <DataTable
            title="Actividad Reciente"
            data={recentActivityData}
            columns={columns}
            searchPlaceholder="Buscar por nombre..."
        />
    </div>
);
