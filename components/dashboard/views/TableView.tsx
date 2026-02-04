import React, { useState } from 'react';
import { Edit2, Trash2, RotateCw } from 'lucide-react';
import { DataTable, Column } from '../../ui/DataTable';
import { Dropdown, DropdownItem } from '../../ui/Dropdown';
import { ClientDetailDrawer } from './ClientDetailDrawer';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';

interface TableEntity {
    id: number;
    name: string;
    status: 'Active' | 'Inactive';
    roleOrPlan: string;
    startDate: string;
}

interface TableViewProps {
    title: string;
    type: 'client' | 'employee';
}

const mockData: TableEntity[] = [
    { id: 1, name: 'Ana López', status: 'Active', roleOrPlan: 'Plan Pro', startDate: '12 Ene 2024' },
    { id: 2, name: 'Carlos Vega', status: 'Active', roleOrPlan: 'Plan Básico', startDate: '15 Feb 2024' },
    { id: 3, name: 'Elena Ruiz', status: 'Active', roleOrPlan: 'Plan Pro', startDate: '01 Mar 2024' },
    { id: 4, name: 'David Diaz', status: 'Inactive', roleOrPlan: 'Plan Anual', startDate: '10 Dic 2023' },
    { id: 5, name: 'Sofia M', status: 'Active', roleOrPlan: 'Plan Estudiante', startDate: '20 Ene 2024' },
];

const mockEmployees: TableEntity[] = [
    { id: 1, name: 'Marcos Trainer', status: 'Active', roleOrPlan: 'Entrenador', startDate: '01 Ene 2023' },
    { id: 2, name: 'Laura Staff', status: 'Active', roleOrPlan: 'Recepción', startDate: '05 Jun 2023' },
    { id: 3, name: 'Pedro Coach', status: 'Active', roleOrPlan: 'Entrenador', startDate: '10 Ago 2023' },
    { id: 4, name: 'Luis Admin', status: 'Active', roleOrPlan: 'Admin', startDate: '01 Dic 2022' },
    { id: 5, name: 'Ana Front', status: 'Inactive', roleOrPlan: 'Recepción', startDate: '15 Ene 2024' },
];

export const TableView: React.FC<TableViewProps> = ({ title, type }) => {
    const [selectedClient, setSelectedClient] = useState<TableEntity | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // CRUD State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<TableEntity | null>(null);
    const [formData, setFormData] = useState({ name: '', roleOrPlan: '' });

    const handleRowClick = (row: TableEntity) => {
        if (type === 'client') {
            setSelectedClient(row);
            setIsDrawerOpen(true);
        }
    };

    const handleOpenModal = (entity?: TableEntity) => {
        if (entity) {
            setEditingEntity(entity);
            setFormData({ name: entity.name, roleOrPlan: entity.roleOrPlan });
        } else {
            setEditingEntity(null);
            setFormData({ name: '', roleOrPlan: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        // Logic to save would go here (updating mock data)
        console.log('Saving', formData);
        setIsModalOpen(false);
    };

    const getActions = (row: TableEntity): DropdownItem[] => {
        const actions: DropdownItem[] = [
            {
                label: 'Editar',
                icon: Edit2,
                onClick: () => handleOpenModal(row)
            }
        ];

        if (type === 'client') {
            actions.push({
                label: 'Renovar Membresía',
                icon: RotateCw,
                onClick: () => {
                    setSelectedClient(row);
                    setIsDrawerOpen(true);
                }
            });
        }

        actions.push({
            label: 'Eliminar',
            icon: Trash2,
            variant: 'danger',
            onClick: () => console.log('Delete', row.id)
        });

        return actions;
    };

    const columns: Column<TableEntity>[] = [
        {
            header: 'Nombre',
            accessorKey: 'name',
            cell: (row) => (
                <button
                    onClick={() => handleRowClick(row)}
                    className={`font-medium text-slate-900 hover:text-blue-600 hover:underline text-left ${type === 'client' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    {row.name}
                </button>
            )
        },
        {
            header: 'Estado',
            cell: (row) => (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium 
                    ${row.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                    {row.status === 'Active' ? 'Activo' : 'Inactivo'}
                </span>
            )
        },
        {
            header: type === 'client' ? 'Plan' : 'Rol',
            accessorKey: 'roleOrPlan',
            className: 'text-slate-500'
        },
        {
            header: 'Fecha Inicio',
            accessorKey: 'startDate',
            className: 'text-slate-400'
        },
        {
            header: 'Acción',
            cell: (row) => (
                <div className="flex justify-end">
                    <Dropdown items={getActions(row)} />
                </div>
            ),
            className: 'text-right'
        }
    ];

    const data = type === 'client' ? mockData : mockEmployees;

    return (
        <>
            <DataTable
                title={title}
                data={data}
                columns={columns}
                searchPlaceholder={`Buscar ${type === 'client' ? 'cliente' : 'empleado'}...`}
                actionLabel={`Nuevo ${type === 'client' ? 'Cliente' : 'Empleado'}`}
                onAction={() => handleOpenModal()}
            />

            <ClientDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                client={selectedClient}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEntity ? `Editar ${type === 'client' ? 'Cliente' : 'Empleado'}` : `Nuevo ${type === 'client' ? 'Cliente' : 'Empleado'}`}
            >
                <div className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        placeholder="Ej. Juan Pérez"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label={type === 'client' ? 'Plan Asignado' : 'Rol / Cargo'}
                        placeholder={type === 'client' ? 'Ej. Plan Mensual' : 'Ej. Entrenador'}
                        value={formData.roleOrPlan}
                        onChange={(e) => setFormData({ ...formData, roleOrPlan: e.target.value })}
                    />
                    {/* Add more fields as needed (Email, Phone, etc.) */}
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
