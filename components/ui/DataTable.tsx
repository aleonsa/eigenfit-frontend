import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title?: string;
    searchPlaceholder?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function DataTable<T extends { id: string | number }>({
    data,
    columns,
    title,
    searchPlaceholder = "Buscar...",
    actionLabel,
    onAction
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');

    // Basic filtering implementation
    const filteredData = data.filter((row) => {
        if (!searchTerm) return true;
        return Object.values(row as any).some(
            (value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="bg-white rounded-lg border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] animate-in fade-in duration-500">
            <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                {title && <h3 className="font-semibold text-slate-900">{title}</h3>}

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-transparent hover:bg-slate-100 focus:bg-white focus:border-slate-200 rounded-md text-sm focus:outline-none w-full sm:w-64 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {actionLabel && onAction && (
                        <Button className="!px-3 !py-1.5 !text-xs whitespace-nowrap" onClick={onAction}>
                            {actionLabel}
                        </Button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className={`px-6 py-3 ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredData.length > 0 ? (
                            filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {columns.map((col, index) => (
                                        <td key={index} className={`px-6 py-4 ${col.className || ''}`}>
                                            {col.cell
                                                ? col.cell(row)
                                                : col.accessorKey
                                                    ? String(row[col.accessorKey])
                                                    : null}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                                    No se encontraron resultados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination Placeholder */}
            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>Mostrando {filteredData.length} resultados</span>
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
                    <button className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" disabled><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
}
