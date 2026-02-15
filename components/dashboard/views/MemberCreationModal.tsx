import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Check, Edit2 } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';

interface MembershipPlan {
    id: string;
    name: string;
    price: number;
}

interface MemberCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    branchId: string;
    onCreated?: () => void;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);

export const MemberCreationModal: React.FC<MemberCreationModalProps> = ({ isOpen, onClose, branchId, onCreated }) => {
    const { apiCall } = useApi();
    const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [selectedPlans, setSelectedPlans] = useState<MembershipPlan[]>([]);
    const [saving, setSaving] = useState(false);
    const [isEditingTotal, setIsEditingTotal] = useState(false);
    const [hasCustomTotal, setHasCustomTotal] = useState(false);
    const [customTotal, setCustomTotal] = useState<string>('');

    useEffect(() => {
        if (!isOpen) return;
        apiCall<MembershipPlan[]>(`/api/v1/membership-plans?branch_id=${branchId}`)
            .then(setPlans)
            .catch((err) => console.error('Error loading plans:', err));
    }, [apiCall, isOpen, branchId]);

    const suggestedTotal = selectedPlans.reduce((sum, p) => sum + p.price, 0);
    const totalPrice = hasCustomTotal ? Number(customTotal || 0) : suggestedTotal;
    const safeTotalPrice = Number.isFinite(totalPrice) ? Math.max(0, totalPrice) : 0;

    useEffect(() => {
        if (!isOpen) {
            setFormData({ full_name: '', email: '', phone: '' });
            setSelectedPlans([]);
            setIsEditingTotal(false);
            setHasCustomTotal(false);
            setCustomTotal('');
            return;
        }

        if (!hasCustomTotal) {
            setCustomTotal(suggestedTotal.toFixed(2));
        }
    }, [isOpen, suggestedTotal, hasCustomTotal]);

    const togglePlan = (plan: MembershipPlan) => {
        setSelectedPlans((prev) =>
            prev.some((s) => s.id === plan.id) ? prev.filter((s) => s.id !== plan.id) : [...prev, plan]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                branch_id: branchId,
                membership_plan_ids: selectedPlans.map((p) => p.id),
                total_payment_amount: selectedPlans.length > 0 ? safeTotalPrice : undefined,
            };
            await apiCall('/api/v1/members', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            onCreated?.();
            onClose();
        } catch (err) {
            console.error('Error saving member:', err);
            alert(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Miembro" width="max-w-xl">
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
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Membresías</label>
                    <div className="flex flex-wrap gap-2">
                        {plans.map((plan) => {
                            const selected = selectedPlans.some((s) => s.id === plan.id);
                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => togglePlan(plan)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                                        selected
                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {selected && <Check size={14} />}
                                    {plan.name} - {formatCurrency(plan.price)}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {selectedPlans.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Costo total</p>
                                {!isEditingTotal && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {hasCustomTotal ? 'Personalizado' : `Sugerido: ${formatCurrency(suggestedTotal)}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasCustomTotal && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHasCustomTotal(false);
                                            setCustomTotal(suggestedTotal.toFixed(2));
                                            setIsEditingTotal(false);
                                        }}
                                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                                    >
                                        Usar sugerido
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isEditingTotal && !hasCustomTotal) {
                                            setCustomTotal(suggestedTotal.toFixed(2));
                                        }
                                        setIsEditingTotal((prev) => !prev);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Editar costo"
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2">
                            {isEditingTotal ? (
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customTotal}
                                    onChange={(e) => {
                                        setCustomTotal(e.target.value);
                                        setHasCustomTotal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                                />
                            ) : (
                                <p className="text-lg font-semibold text-slate-900">{formatCurrency(safeTotalPrice)}</p>
                            )}
                        </div>
                    </div>
                )}
                <div className="pt-2 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
