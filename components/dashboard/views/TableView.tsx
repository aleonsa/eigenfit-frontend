import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MemberDetailDrawer } from './MemberDetailDrawer';
import { Modal } from '../../ui/Modal';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useApi } from '../../../hooks/useApi';
import { MemberCreationModal } from './MemberCreationModal';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { MemberDirectory, type MemberRow } from './MemberDirectory';
import { EmployeeDirectory } from './EmployeeDirectory';

interface TableViewProps {
    title: string;
    type: 'member' | 'employee';
    branchId: string;
    timezone?: string;
}

export const TableView: React.FC<TableViewProps> = ({ title, type, branchId, timezone }) => {
    const { apiCall } = useApi();
    const queryClient = useQueryClient();

    const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // CRUD Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
    const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
    const [isCoach, setIsCoach] = useState(false);
    const [saving, setSaving] = useState(false);

    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Invite modal state
    const [invitingEmployee, setInvitingEmployee] = useState<MemberRow | null>(null);
    const [inviteRole, setInviteRole] = useState('staff');
    const [inviting, setInviting] = useState(false);

    const endpoint = type === 'member' ? 'members' : 'employees';

    const invalidateTable = () => {
        if (type === 'employee') {
            void queryClient.invalidateQueries({ queryKey: ['class-coaches', branchId] });
        }
        return queryClient.invalidateQueries({ queryKey: ['table', type, branchId] });
    };

    const openMember = (row: MemberRow) => {
        setSelectedMember(row);
        setIsDrawerOpen(true);
    };

    const handleOpenModal = (member?: MemberRow) => {
        setIsCoach(member?.is_coach ?? false);
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
            const fields = type === 'employee' ? { ...formData, is_coach: isCoach } : formData;
            const payload = editingMember ? fields : { ...fields, branch_id: branchId };

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

    return (
        <>
            <ErrorBoundary>
                {type === 'member' ? <MemberDirectory title={title} branchId={branchId} timezone={timezone}
                    onNew={() => setIsMemberModalOpen(true)} onOpen={openMember} onEdit={handleOpenModal} onDelete={setDeletingId} /> :
                    <EmployeeDirectory title={title} branchId={branchId} timezone={timezone} onNew={() => handleOpenModal()} onEdit={handleOpenModal}
                        onInvite={row => { setInvitingEmployee(row); setInviteRole('staff'); }} onDelete={setDeletingId} />}
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
                timezone={timezone}
                onMembershipUpdated={invalidateTable}
                onEditMember={() => {
                    if (!selectedMember) return;
                    setIsDrawerOpen(false);
                    handleOpenModal(selectedMember);
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
                    {type === 'employee' && (
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={isCoach}
                                onChange={(event) => setIsCoach(event.target.checked)}
                                className="h-4 w-4 accent-slate-700"
                            />
                            Da clases (coach)
                        </label>
                    )}
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
