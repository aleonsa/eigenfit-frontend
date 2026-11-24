import React, { useState } from 'react';
import { Plus, Trash2, CreditCard, Edit2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input, Select } from '../../ui/Input';
import { useApi } from '../../../hooks/useApi';
import { useApiQuery } from '../../../hooks/useApiQuery';
import type { ClassAccessMode } from '../../../types';

interface MembershipPlan {
    id: string;
    branch_id: string;
    name: string;
    description: string | null;
    price: number;
    duration_months: number;
    class_access: ClassAccessMode;
    class_credit_limit: number | null;
}

const classAccessLabels: Record<ClassAccessMode, string> = {
    none: 'Sin clases',
    unlimited: 'Clases ilimitadas',
    credits: 'Paquete de N clases',
};

const classAccessOptions = Object.entries(classAccessLabels).map(([value, label]) => ({ value, label }));

const emptyForm: {
    name: string;
    description: string;
    duration_months: string;
    price: string;
    class_access: ClassAccessMode;
    class_credit_limit: string;
} = { name: '', description: '', duration_months: '', price: '', class_access: 'none', class_credit_limit: '' };

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
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const handleOpenModal = (plan?: MembershipPlan) => {
        if (plan) {
            setEditingId(plan.id);
            setFormData({
                name: plan.name,
                description: plan.description || '',
                duration_months: plan.duration_months.toString(),
                price: plan.price.toString(),
                class_access: plan.class_access ?? 'none',
                class_credit_limit: plan.class_credit_limit?.toString() ?? '',
            });
        } else {
            setEditingId(null);
            setFormData(emptyForm);
        }
        setSaveError('');
        setIsModalOpen(true);
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            duration_months: Number(formData.duration_months),
            price: Number(formData.price),
            class_access: formData.class_access,
            class_credit_limit: formData.class_access === 'credits' ? Number(formData.class_credit_limit) : null,
        };
        if (!payload.name) {
            setSaveError('Escribe un título para el plan.');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            await apiCall(editingId ? `/api/v1/membership-plans/${editingId}` : '/api/v1/membership-plans', {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify(editingId ? payload : { ...payload, branch_id: branchId }),
            });
            await invalidatePlans();
            setIsModalOpen(false);
        } catch (e) {
            console.error('Error saving plan:', e);
            setSaveError('No se pudo guardar el plan. Intenta de nuevo.');
        } finally {
            setSaving(false);
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
                                <span className="font-medium text-slate-900 text-sm break-words">{plan.name}</span>
                                <p className="mt-1 text-xs text-slate-600">
                                    {plan.class_access === 'credits'
                                        ? `Paquete de ${plan.class_credit_limit} ${plan.class_credit_limit === 1 ? 'clase' : 'clases'}`
                                        : classAccessLabels[plan.class_access ?? 'none']}
                                </p>
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
                onClose={() => { if (!saving) setIsModalOpen(false); }}
                title={editingId ? 'Editar Membresía' : 'Nueva Membresía'}
            >
                <form className="max-h-[calc(100dvh-10rem)] overflow-y-auto space-y-4" onSubmit={handleSave}>
                    <Input
                        label="Título"
                        aria-label="Título"
                        required
                        maxLength={255}
                        placeholder="Ej. Mensualidad Gym"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Descripción"
                        aria-label="Descripción"
                        maxLength={1024}
                        placeholder="Ej. Acceso a todas las áreas"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Duración (Meses)"
                            aria-label="Duración en meses"
                            type="number"
                            min={1}
                            step={1}
                            required
                            placeholder="1"
                            value={formData.duration_months}
                            onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                        />
                        <Input
                            label="Precio"
                            aria-label="Precio"
                            type="number"
                            min={0}
                            step="any"
                            required
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                    </div>
                    <Select
                        label="Acceso a clases"
                        aria-label="Acceso a clases"
                        value={formData.class_access}
                        options={classAccessOptions}
                        onChange={(event) => {
                            const mode = event.target.value;
                            if (mode === 'none' || mode === 'unlimited' || mode === 'credits') {
                                setFormData({ ...formData, class_access: mode, class_credit_limit: '' });
                            }
                        }}
                    />
                    {formData.class_access === 'credits' && (
                        <Input
                            label="Clases incluidas"
                            aria-label="Clases incluidas"
                            type="number"
                            min={1}
                            max={2147483647}
                            step={1}
                            required
                            value={formData.class_credit_limit}
                            onChange={(event) => setFormData({ ...formData, class_credit_limit: event.target.value })}
                        />
                    )}
                    {saveError && <p role="alert" className="text-sm text-slate-700">{saveError}</p>}
                    <div className="flex flex-wrap justify-end gap-3">
                        <Button type="button" variant="outline" disabled={saving} onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
};
