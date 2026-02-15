import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../ui/Drawer';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { User, CreditCard, Clock, RotateCw, Edit2, Check } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';

interface Member {
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

interface MembershipPlan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
}

interface MemberMembership {
    id: string;
    membership_plan_id: string;
    membership_plan_name: string;
    membership_plan_price: number;
    duration_months: number;
    payment_amount: number;
    start_date: string;
    due_date: string;
    end_date: string | null;
    is_active: boolean;
}

interface MemberDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    member: Member | null;
    onMembershipUpdated?: () => void;
    onEditMember?: (member: Member) => void;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const dateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
    isOpen,
    onClose,
    member,
    onMembershipUpdated,
    onEditMember,
}) => {
    const { apiCall } = useApi();

    const [memberships, setMemberships] = useState<MemberMembership[]>([]);
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [loadingMemberships, setLoadingMemberships] = useState(false);
    const [savingRenewal, setSavingRenewal] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [renewalPlanIds, setRenewalPlanIds] = useState<string[]>([]);
    const [isEditingRenewalPrice, setIsEditingRenewalPrice] = useState(false);
    const [isEditingRenewalDate, setIsEditingRenewalDate] = useState(false);
    const [hasCustomRenewalPrice, setHasCustomRenewalPrice] = useState(false);
    const [hasCustomRenewalDate, setHasCustomRenewalDate] = useState(false);
    const [renewalPrice, setRenewalPrice] = useState('');
    const [renewalDueDate, setRenewalDueDate] = useState(dateInputValue(new Date()));

    const loadMemberContext = useCallback(async () => {
        if (!member) return;

        setLoadingMemberships(true);
        try {
            const [memberMemberships, branchPlans] = await Promise.all([
                apiCall<MemberMembership[]>(`/api/v1/members/${member.id}/memberships`),
                apiCall<MembershipPlan[]>(`/api/v1/membership-plans?branch_id=${member.branch_id}`),
            ]);
            setMemberships(memberMemberships);
            setPlans(branchPlans);
        } catch (error) {
            console.error('Error loading member detail:', error);
            setMemberships([]);
            setPlans([]);
        } finally {
            setLoadingMemberships(false);
        }
    }, [apiCall, member]);

    useEffect(() => {
        if (!isOpen || !member) return;
        loadMemberContext();
    }, [isOpen, member, loadMemberContext]);

    const activeMemberships = useMemo(
        () => memberships.filter((membership) => membership.is_active),
        [memberships],
    );

    const selectedRenewalPlans = useMemo(
        () => plans.filter((plan) => renewalPlanIds.includes(plan.id)),
        [plans, renewalPlanIds],
    );

    const suggestedRenewalPrice = useMemo(
        () => selectedRenewalPlans.reduce((sum, plan) => sum + plan.price, 0),
        [selectedRenewalPlans],
    );

    const suggestedRenewalDate = useMemo(() => {
        if (selectedRenewalPlans.length === 0) {
            return dateInputValue(new Date());
        }

        const now = new Date();
        const selectedActiveMemberships = activeMemberships.filter((membership) =>
            renewalPlanIds.includes(membership.membership_plan_id),
        );

        const latestCurrentDueDate = selectedActiveMemberships.reduce((latest, membership) => {
            const dueDate = new Date(membership.due_date);
            return dueDate > latest ? dueDate : latest;
        }, now);

        const baseDate = latestCurrentDueDate > now ? latestCurrentDueDate : now;
        const longestDuration = Math.max(...selectedRenewalPlans.map((plan) => plan.duration_months), 1);
        const suggested = new Date(baseDate);
        suggested.setDate(suggested.getDate() + longestDuration * 30);

        return dateInputValue(suggested);
    }, [activeMemberships, renewalPlanIds, selectedRenewalPlans]);

    useEffect(() => {
        if (!isRenewModalOpen || isEditingRenewalPrice || hasCustomRenewalPrice) return;
        setRenewalPrice(suggestedRenewalPrice.toFixed(2));
    }, [isRenewModalOpen, isEditingRenewalPrice, hasCustomRenewalPrice, suggestedRenewalPrice]);

    useEffect(() => {
        if (!isRenewModalOpen || isEditingRenewalDate || hasCustomRenewalDate) return;
        setRenewalDueDate(suggestedRenewalDate);
    }, [isRenewModalOpen, isEditingRenewalDate, hasCustomRenewalDate, suggestedRenewalDate]);

    const openRenewModal = () => {
        const activePlanIds = activeMemberships.map((membership) => membership.membership_plan_id);
        setRenewalPlanIds(activePlanIds);
        setIsEditingRenewalPrice(false);
        setIsEditingRenewalDate(false);
        setHasCustomRenewalPrice(false);
        setHasCustomRenewalDate(false);
        setRenewalPrice((activePlanIds.length > 0 ? suggestedRenewalPrice : 0).toFixed(2));
        setRenewalDueDate(suggestedRenewalDate);
        setIsRenewModalOpen(true);
    };

    const toggleRenewPlan = (planId: string) => {
        setRenewalPlanIds((prev) =>
            prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId],
        );
    };

    const handleRenewMemberships = async () => {
        if (!member) return;
        if (renewalPlanIds.length === 0) {
            alert('Selecciona al menos una membresía para renovar.');
            return;
        }

        const paymentAmount = Number(renewalPrice || 0);
        if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
            alert('Ingresa un monto válido.');
            return;
        }

        if (!renewalDueDate) {
            alert('Selecciona una fecha de vencimiento.');
            return;
        }

        setSavingRenewal(true);
        try {
            await apiCall(`/api/v1/members/${member.id}/renew-memberships`, {
                method: 'POST',
                body: JSON.stringify({
                    membership_plan_ids: renewalPlanIds,
                    total_payment_amount: paymentAmount,
                    due_date: `${renewalDueDate}T00:00:00`,
                }),
            });
            setIsRenewModalOpen(false);
            await loadMemberContext();
            onMembershipUpdated?.();
        } catch (error: any) {
            console.error('Error renewing memberships:', error);
            alert(`No se pudo renovar: ${error.message}`);
        } finally {
            setSavingRenewal(false);
        }
    };

    if (!member) return null;

    return (
        <>
            <Drawer
                isOpen={isOpen}
                onClose={onClose}
                title="Detalles del Miembro"
                subtitle={`Información detallada de ${member.full_name}`}
                width="max-w-md"
            >
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{member.full_name}</h3>
                            <p className="text-slate-500 text-sm">{member.email}</p>
                            {member.phone && (
                                <p className="text-slate-400 text-xs mt-0.5">{member.phone}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="justify-center gap-2"
                            onClick={() => onEditMember?.(member)}
                        >
                            <Edit2 size={16} />
                            Editar
                        </Button>
                        <Button className="justify-center gap-2" onClick={openRenewModal} disabled={loadingMemberships}>
                            <RotateCw size={16} />
                            Renovar
                        </Button>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                            <CreditCard size={18} className="text-blue-500" />
                            Membresía Actual
                        </h4>
                        {loadingMemberships && <p className="text-sm text-slate-400">Cargando membresías...</p>}
                        {!loadingMemberships && activeMemberships.length === 0 && (
                            <p className="text-sm text-slate-400">Sin membresía activa</p>
                        )}
                        {!loadingMemberships && activeMemberships.length > 0 && (
                            <div className="space-y-2">
                                {activeMemberships.map((membership) => (
                                    <div key={membership.id} className="flex items-center justify-between text-sm">
                                        <p className="font-medium text-slate-800">{membership.membership_plan_name}</p>
                                        <p className="text-slate-500">Vence: {formatDate(membership.due_date)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-slate-400" />
                            Historial de Visitas
                        </h4>
                        <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="text-sm">
                                        <p className="font-medium text-slate-900">Check-in: Gimnasio</p>
                                        <p className="text-xs text-slate-500">Hoy, 10:30 AM</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Drawer>

            <Modal
                isOpen={isRenewModalOpen}
                onClose={() => setIsRenewModalOpen(false)}
                title="Renovar Membresías"
                width="max-w-xl"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">Membresías a renovar</label>
                        <div className="flex flex-wrap gap-2">
                            {plans.map((plan) => {
                                const selected = renewalPlanIds.includes(plan.id);
                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => toggleRenewPlan(plan.id)}
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

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Costo total</p>
                                {!isEditingRenewalPrice && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {hasCustomRenewalPrice ? 'Personalizado' : `Sugerido: ${formatCurrency(suggestedRenewalPrice)}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasCustomRenewalPrice && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHasCustomRenewalPrice(false);
                                            setIsEditingRenewalPrice(false);
                                            setRenewalPrice(suggestedRenewalPrice.toFixed(2));
                                        }}
                                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                                    >
                                        Usar sugerido
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isEditingRenewalPrice && !hasCustomRenewalPrice) {
                                            setRenewalPrice((Number(renewalPrice || suggestedRenewalPrice) || 0).toFixed(2));
                                        }
                                        setIsEditingRenewalPrice((prev) => !prev);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Editar costo"
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2">
                            {isEditingRenewalPrice ? (
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={renewalPrice}
                                    onChange={(e) => {
                                        setRenewalPrice(e.target.value);
                                        setHasCustomRenewalPrice(true);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                                />
                            ) : (
                                <p className="text-lg font-semibold text-slate-900">
                                    {formatCurrency(Number(renewalPrice || 0))}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Fecha de vencimiento</p>
                                {!isEditingRenewalDate && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {hasCustomRenewalDate ? 'Personalizada' : `Sugerida: ${formatDate(`${suggestedRenewalDate}T00:00:00`)}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasCustomRenewalDate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHasCustomRenewalDate(false);
                                            setIsEditingRenewalDate(false);
                                            setRenewalDueDate(suggestedRenewalDate);
                                        }}
                                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                                    >
                                        Usar sugerida
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsEditingRenewalDate((prev) => !prev)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Editar fecha"
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2">
                            {isEditingRenewalDate ? (
                                <input
                                    type="date"
                                    value={renewalDueDate}
                                    onChange={(e) => {
                                        setRenewalDueDate(e.target.value);
                                        setHasCustomRenewalDate(true);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                                />
                            ) : (
                                <p className="text-lg font-semibold text-slate-900">
                                    {renewalDueDate ? formatDate(`${renewalDueDate}T00:00:00`) : '—'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-1 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleRenewMemberships} disabled={savingRenewal || renewalPlanIds.length === 0}>
                            {savingRenewal ? 'Renovando...' : 'Confirmar Renovación'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
