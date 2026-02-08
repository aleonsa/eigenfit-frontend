import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Check } from 'lucide-react';
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
}

export const MemberCreationModal: React.FC<MemberCreationModalProps> = ({ isOpen, onClose, branchId }) => {
    const { apiCall } = useApi();
    const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [selectedPlans, setSelectedPlans] = useState<MembershipPlan[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        apiCall<MembershipPlan[]>(`/api/v1/membership-plans?branch_id=${branchId}`)
            .then(setPlans)
            .catch((err) => console.error('Error loading plans:', err));
    }, [isOpen, branchId]);

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
            };
            await apiCall('/api/v1/members', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            onClose();
        } catch (err) {
            console.error('Error saving member:', err);
            alert(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const totalPrice = selectedPlans.reduce((sum, p) => sum + p.price, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Miembro">
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
                                    {plan.name} - ${plan.price}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {totalPrice > 0 && (
                    <div className="text-right text-sm font-medium text-slate-700">
                        Total: ${totalPrice}
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
