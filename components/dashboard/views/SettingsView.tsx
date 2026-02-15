import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Lock, CreditCard, Monitor, ExternalLink, Loader2 } from 'lucide-react';
import { KIOSK_PIN_KEY, getKioskPin } from './kiosk/KioskPinModal';
import { useApi } from '../../../hooks/useApi';
import type { BillingStatus, PaymentHistory } from '../../../types';

interface SettingsViewProps {
    branchId: string;
    userRole: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ branchId, userRole }) => {
    const { apiCall } = useApi();
    const isAdmin = userRole !== 'employee';
    const [activeTab, setActiveTab] = useState<'security' | 'billing' | 'kiosk'>('security');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Billing state
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory | null>(null);
    const [billingLoading, setBillingLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const loadBillingData = useCallback(async () => {
        setBillingLoading(true);
        try {
            const [status, history] = await Promise.all([
                apiCall<BillingStatus>(`/api/v1/billing/status?branch_id=${branchId}`),
                apiCall<PaymentHistory>(`/api/v1/billing/history?branch_id=${branchId}&limit=10`),
            ]);
            setBillingStatus(status);
            setPaymentHistory(history);
        } catch (e) {
            console.error('Error loading billing data:', e);
        } finally {
            setBillingLoading(false);
        }
    }, [branchId, apiCall]);

    useEffect(() => {
        if (activeTab === 'billing') {
            loadBillingData();
        }
    }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleOpenPortal = async () => {
        setPortalLoading(true);
        try {
            const data = await apiCall<{ portal_url: string }>(`/api/v1/billing/portal-session?branch_id=${branchId}`, {
                method: 'POST',
                body: JSON.stringify({ return_url: window.location.href }),
            });
            window.open(data.portal_url, '_blank');
        } catch (e) {
            console.error('Error opening billing portal:', e);
        } finally {
            setPortalLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar tu suscripción? Se mantendrá activa hasta el final del periodo actual.')) return;
        setCancelLoading(true);
        try {
            await apiCall(`/api/v1/billing/cancel?branch_id=${branchId}`, { method: 'POST' });
            await loadBillingData();
        } catch (e) {
            console.error('Error canceling subscription:', e);
        } finally {
            setCancelLoading(false);
        }
    };

    const handlePinChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPinMessage(null);

        if (currentPin !== getKioskPin()) {
            setPinMessage({ type: 'error', text: 'El PIN actual es incorrecto.' });
            return;
        }
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            setPinMessage({ type: 'error', text: 'El nuevo PIN debe ser de 4 dígitos numéricos.' });
            return;
        }
        if (newPin !== confirmPin) {
            setPinMessage({ type: 'error', text: 'Los PINs no coinciden.' });
            return;
        }

        localStorage.setItem(KIOSK_PIN_KEY, newPin);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinMessage({ type: 'success', text: 'PIN actualizado correctamente.' });
    };

    const formatAmount = (cents: number | null, currency: string | null) => {
        if (cents === null) return '—';
        const amount = cents / 100;
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency || 'MXN',
        }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const statusLabels: Record<string, { label: string; className: string }> = {
        active: { label: 'Activo', className: 'text-green-600 bg-green-50' },
        pending: { label: 'Pendiente', className: 'text-yellow-600 bg-yellow-50' },
        past_due: { label: 'Pago vencido', className: 'text-red-600 bg-red-50' },
        canceled: { label: 'Cancelado', className: 'text-slate-600 bg-slate-100' },
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuración</h2>
            <p className="text-slate-500 mb-8">Administra tu cuenta, contraseña y métodos de pago.</p>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 mb-8">
                <button
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <Lock size={16} />
                    Seguridad
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'billing'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <CreditCard size={16} />
                        Facturación
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('kiosk')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kiosk'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Monitor size={16} />
                        Modo Kiosco
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                {activeTab === 'security' && (
                    <div className="max-w-md space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Cambiar Contraseña</h3>
                            <p className="text-sm text-slate-500 mt-1">Asegúrate de usar una contraseña segura.</p>
                        </div>

                        <div className="space-y-4">
                            <Input label="Contraseña Actual" type="password" placeholder="••••••••" />
                            <Input label="Nueva Contraseña" type="password" placeholder="••••••••" />
                            <Input label="Confirmar Contraseña" type="password" placeholder="••••••••" />
                        </div>

                        <div className="pt-2">
                            <Button>Actualizar Contraseña</Button>
                        </div>
                    </div>
                )}

                {isAdmin && activeTab === 'billing' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {billingLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : billingStatus ? (
                            <>
                                {/* Plan & Status */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Tu Plan</h3>
                                    <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 capitalize">
                                                    Plan {billingStatus.billing_plan}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {billingStatus.current_period_end
                                                        ? `Próximo cobro: ${formatDate(billingStatus.current_period_end)}`
                                                        : 'Sin periodo activo'}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                statusLabels[billingStatus.billing_status]?.className || 'text-slate-600 bg-slate-100'
                                            }`}>
                                                {statusLabels[billingStatus.billing_status]?.label || billingStatus.billing_status}
                                            </span>
                                        </div>
                                        {billingStatus.cancel_at_period_end && (
                                            <p className="text-xs text-amber-600 mt-2">
                                                Tu suscripción se cancelará al final del periodo actual.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenPortal}
                                        isLoading={portalLoading}
                                        className="gap-2"
                                    >
                                        <ExternalLink size={16} />
                                        Gestionar facturación
                                    </Button>
                                    {billingStatus.billing_status === 'active' && !billingStatus.cancel_at_period_end && (
                                        <Button
                                            variant="secondary"
                                            onClick={handleCancelSubscription}
                                            isLoading={cancelLoading}
                                        >
                                            Cancelar suscripción
                                        </Button>
                                    )}
                                </div>

                                {/* Payment History */}
                                {paymentHistory && paymentHistory.items.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial de Pagos</h3>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 font-medium text-slate-500">Fecha</th>
                                                        <th className="text-left px-4 py-3 font-medium text-slate-500">Periodo</th>
                                                        <th className="text-right px-4 py-3 font-medium text-slate-500">Monto</th>
                                                        <th className="text-right px-4 py-3 font-medium text-slate-500">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {paymentHistory.items.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-3 text-slate-700">{formatDate(item.paid_at)}</td>
                                                            <td className="px-4 py-3 text-slate-500">
                                                                {formatDate(item.period_start)} — {formatDate(item.period_end)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                                                {formatAmount(item.amount_cents, item.currency)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                                    item.status === 'paid'
                                                                        ? 'text-green-600 bg-green-50'
                                                                        : 'text-slate-600 bg-slate-100'
                                                                }`}>
                                                                    {item.status === 'paid' ? 'Pagado' : item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-slate-500">No hay información de facturación disponible.</p>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && activeTab === 'kiosk' && (
                    <div className="max-w-md space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">PIN del Modo Kiosco</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Cambia el PIN que se usa para desbloquear el modo kiosco.
                            </p>
                        </div>

                        <form onSubmit={handlePinChange} className="space-y-4">
                            <Input
                                label="PIN Actual"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value)}
                            />
                            <Input
                                label="Nuevo PIN"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                            />
                            <Input
                                label="Confirmar Nuevo PIN"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                            />

                            {pinMessage && (
                                <p className={`text-sm ${pinMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                    {pinMessage.text}
                                </p>
                            )}

                            <div className="pt-2">
                                <Button type="submit">Actualizar PIN</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
