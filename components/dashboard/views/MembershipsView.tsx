import React, { useState } from 'react';
import { Plus, Trash2, CreditCard, Edit2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { useApi } from '../../../hooks/useApi';
import { useApiQuery } from '../../../hooks/useApiQuery';

interface MembershipPlan {
    id: string;
    branch_id: string;
    name: string;
    description: string | null;
    price: number;
    duration_months: number;
}

interface MembershipsViewProps {
    branchId: string;
}

export const MembershipsView: React.FC<MembershipsViewProps> = ({ branchId }) => {
    const { apiCall } = useApi();
    const queryClient = useQueryClient();
    const queryKey = ['membership-plans', branchId];

    const { data: plans = [], isLoading: loading } = useApiQuery<MembershipPlan[]>(
        queryKey,
        `/api/v1/membership-plans?branch_id=${branchId}`,
    );

    const invalidatePlans = () => queryClient.invalidateQueries({ queryKey });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', duration_months: '', price: '' });

    const handleOpenModal = (plan?: MembershipPlan) => {
        if (plan) {
            setEditingId(plan.id);
            setFormData({
                name: plan.name,
                description: plan.description || '',
                duration_months: plan.duration_months.toString(),
                price: plan.price.toString()
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', description: '', duration_months: '', price: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await apiCall(`/api/v1/membership-plans/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formData.name,
                        description: formData.description || null,
                        duration_months: Number(formData.duration_months),
                        price: Number(formData.price),
                    }),
                });
            } else {
                await apiCall('/api/v1/membership-plans', {
                    method: 'POST',
                    body: JSON.stringify({
                        branch_id: branchId,
                        name: formData.name,
                        description: formData.description || null,
                        duration_months: Number(formData.duration_months),
                        price: Number(formData.price),
                    }),
                });
            }
            invalidatePlans();
            setIsModalOpen(false);
        } catch (e) {
            console.error('Error saving plan:', e);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiCall(`/api/v1/membership-plans/${id}`, { method: 'DELETE' });
            invalidatePlans();
        } catch (e) {
            console.error('Error deleting plan:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                Cargando...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Membresías</h2>
                    <p className="text-sm text-slate-500 mt-1">Administra los planes y paquetes de tu gimnasio.</p>
                </div>
                <Button className="gap-2" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Nueva Membresía
                </Button>
            </div>

            <div className="space-y-3">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-lg border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-100 transition-all duration-200"
                    >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                            <div className="sm:col-span-3">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Título</label>
                                <span className="font-medium text-slate-900 text-sm">{plan.name}</span>
                            </div>

                            <div className="sm:col-span-5">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Descripción</label>
                                <span className="text-sm text-slate-500 truncate block">{plan.description || '—'}</span>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Duración</label>
                                <span className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md inline-block">
                                    {plan.duration_months} {plan.duration_months === 1 ? 'Mes' : 'Meses'}
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Precio</label>
                                <span className="font-bold text-slate-900">${plan.price}</span>
                            </div>

                        </div>

                        <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 mt-2 sm:mt-0 justify-end">
                            <button
                                onClick={() => handleOpenModal(plan)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(plan.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-100 border-dashed">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <CreditCard size={20} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900">No hay membresías</h3>
                        <p className="text-xs text-slate-500 mt-1">Crea una nueva membresía para comenzar.</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Editar Membresía' : 'Nueva Membresía'}
            >
                <div className="space-y-4">
                    <Input
                        label="Título"
                        placeholder="Ej. Mensualidad Gym"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Descripción"
                        placeholder="Ej. Acceso a todas las áreas"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Duración (Meses)"
                            type="number"
                            placeholder="1"
                            value={formData.duration_months}
                            onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                        />
                        <Input
                            label="Precio"
                            type="number"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};
