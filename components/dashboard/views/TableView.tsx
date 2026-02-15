import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, RotateCw, Mail } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, Column } from '../../ui/DataTable';
import { MemberDetailDrawer } from './MemberDetailDrawer';
import { Modal } from '../../ui/Modal';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useApi } from '../../../hooks/useApi';
import { MemberCreationModal } from './MemberCreationModal';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

interface MemberRow {
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
}

const formatCode = (code: number, role: string): string =>
    role === 'employee' ? `E-${code}` : String(code);

interface MemberPage {
    items: MemberRow[];
    total: number;
}

interface TableViewProps {
    title: string;
    type: 'member' | 'employee';
    branchId: string;
}

const PAGE_SIZE = 20;

export const TableView: React.FC<TableViewProps> = ({ title, type, branchId }) => {
    const { apiCall } = useApi();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);

    const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // CRUD Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
    const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
    const [saving, setSaving] = useState(false);

    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Invite modal state
    const [invitingEmployee, setInvitingEmployee] = useState<MemberRow | null>(null);
    const [inviteRole, setInviteRole] = useState('staff');
    const [inviting, setInviting] = useState(false);

    const endpoint = type === 'member' ? 'members' : 'employees';
    const queryKey = ['table', type, branchId, page, debouncedSearch];

    const { data, isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            const skip = page * PAGE_SIZE;
            return apiCall<MemberPage>(
                `/api/v1/${endpoint}?branch_id=${branchId}&skip=${skip}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debouncedSearch)}`
            );
        },
    });

    const members = data?.items ?? [];
    const total = data?.total ?? 0;

    const invalidateTable = () => queryClient.invalidateQueries({ queryKey: ['table', type, branchId] });

    useEffect(() => {
        setPage(0);
    }, [debouncedSearch]);

    const handleRowClick = (row: MemberRow) => {
        if (type === 'member') {
            setSelectedMember(row);
            setIsDrawerOpen(true);
        }
    };

    const handleOpenModal = (member?: MemberRow) => {
        if (member) {
            setEditingMember(member);
            setFormData({ full_name: member.full_name, email: member.email, phone: member.phone || '' });
        } else {
            setEditingMember(null);
            setFormData({ full_name: '', email: '', phone: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = editingMember
                ? formData
                : { ...formData, branch_id: branchId };

            if (editingMember) {
                await apiCall(`/api/v1/${endpoint}/${editingMember.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiCall(`/api/v1/${endpoint}`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            setIsModalOpen(false);
            invalidateTable();
        } catch (err: any) {
            console.error('Error saving member:', err);
            alert(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await apiCall(`/api/v1/${endpoint}/${deletingId}`, { method: 'DELETE' });
            invalidateTable();
        } catch (err) {
            console.error('Error deleting member:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleInvite = async () => {
        if (!invitingEmployee) return;
        setInviting(true);
        try {
            await apiCall(`/api/v1/employees/${invitingEmployee.id}/invite`, {
                method: 'POST',
                body: JSON.stringify({ dashboard_role: inviteRole }),
            });
            setInvitingEmployee(null);
            alert(`Invitación enviada a ${invitingEmployee.email}`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setInviting(false);
        }
    };

    const columns: Column<MemberRow>[] = [
        {
            header: 'ID',
            cell: (row) => (
                <span className="font-mono font-semibold text-slate-700">{formatCode(row.code, row.role)}</span>
            ),
            className: 'w-20',
        },
        {
            header: 'Nombre',
            cell: (row) => (
                <button
                    onClick={() => handleRowClick(row)}
                    className={`font-medium text-slate-900 hover:text-blue-600 hover:underline text-left ${type === 'member' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    {row.full_name}
                    {type === 'member' && (
                        <>
                            <br />
                            <span className="text-sm text-slate-500">{row.email}</span>
                        </>
                    )}
                </button>
            ),
        },
        {
            header: 'Teléfono',
            cell: (row) => <span className="text-slate-400">{row.phone || '—'}</span>,
        },
        ...(type === 'member'
            ? [{
                header: 'Membresías',
                cell: (row: MemberRow) => <span>{row.memberships?.join(', ') || '—'}</span>,
            }]
            : [{
                header: 'Correo',
                cell: (row: MemberRow) => <span className="text-slate-600">{row.email}</span>,
            }]),
        {
            header: 'Estado',
            cell: (row) => (
                <span className={`font-medium ${row.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {row.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            header: 'Fecha Registro',
            cell: (row) => (
                <span className="text-slate-400">
                    {new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            ),
        },
        {
            header: '',
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                    >
                        <Edit2 size={15} />
                    </button>
                    {type === 'member' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMember(row); setIsDrawerOpen(true); }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Renovar Membresía"
                        >
                            <RotateCw size={15} />
                        </button>
                    )}
                    {type === 'employee' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setInvitingEmployee(row); setInviteRole('staff'); }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Invitar al dashboard"
                        >
                            <Mail size={15} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeletingId(row.id); }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    return (
        <>
            <ErrorBoundary>
                <DataTable
                    title={title}
                    data={members}
                    columns={columns}
                    searchPlaceholder={`Buscar ${type === 'member' ? 'miembro' : 'empleado'}...`}
                    searchValue={search}
                    onSearchChange={setSearch}
                    actionLabel={`Nuevo ${type === 'member' ? 'Miembro' : 'Empleado'}`}
                    onAction={() => {
                        if (type === 'member') {
                            setIsMemberModalOpen(true);
                        } else {
                            handleOpenModal();
                        }
                    }}
                    loading={loading}
                    pagination={{
                        page,
                        pageSize: PAGE_SIZE,
                        totalItems: total,
                        onPageChange: setPage,
                    }}
                />
            </ErrorBoundary>

            {type === 'member' && (
                <MemberCreationModal
                    isOpen={isMemberModalOpen}
                    onClose={() => setIsMemberModalOpen(false)}
                    branchId={branchId}
                    onCreated={() => {
                        setIsMemberModalOpen(false);
                        invalidateTable();
                    }}
                />
            )}

            <MemberDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                member={selectedMember}
                onMembershipUpdated={invalidateTable}
                onEditMember={(memberToEdit) => {
                    setIsDrawerOpen(false);
                    handleOpenModal(memberToEdit);
                }}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingMember ? `Editar ${type === 'member' ? 'Miembro' : 'Empleado'}` : `Nuevo ${type === 'member' ? 'Miembro' : 'Empleado'}`}
            >
                <div className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        placeholder="Ej. Juan Pérez"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                    <Input
                        label="Email"
                        placeholder="Ej. juan@email.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Teléfono"
                        placeholder="Ej. +52 55 1234 5678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Confirmar eliminación"
            >
                <p className="text-sm text-slate-600 mb-6">
                    ¿Estás seguro de que deseas eliminar este {type === 'member' ? 'miembro' : 'empleado'}? Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
                </div>
            </Modal>

            <Modal
                isOpen={!!invitingEmployee}
                onClose={() => setInvitingEmployee(null)}
                title="Invitar al Dashboard"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Se enviará una invitación a <span className="font-medium text-slate-900">{invitingEmployee?.email}</span> para acceder al dashboard.
                    </p>
                    <Select
                        label="Rol en el Dashboard"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        options={[
                            { value: 'staff', label: 'Staff — Acceso básico' },
                            { value: 'admin', label: 'Admin — Acceso completo' },
                        ]}
                    />
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setInvitingEmployee(null)}>Cancelar</Button>
                        <Button onClick={handleInvite} disabled={inviting}>
                            {inviting ? 'Enviando...' : 'Enviar Invitación'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
