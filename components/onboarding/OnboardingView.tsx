import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useApi } from '../../hooks/useApi';
import type { CreateBranchResponse, PlanPrice, PlansResponse } from '../../types';

interface OnboardingViewProps {
    userId?: string;
    onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ userId, onComplete }) => {
    const { apiCall } = useApi();
    const [step, setStep] = useState(0);
    const [gymName, setGymName] = useState('');
    const [address, setAddress] = useState('');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [prices, setPrices] = useState<PlanPrice[]>([]);
    const [loadingPrices, setLoadingPrices] = useState(true);

    useEffect(() => {
        apiCall<PlansResponse>('/api/v1/billing/plans')
            .then((data) => setPrices(data.prices))
            .catch((e) => console.error('Failed to load prices:', e))
            .finally(() => setLoadingPrices(false));
    }, []);

    const monthlyPrice = prices.find((p) => p.interval === 'monthly');
    const yearlyPrice = prices.find((p) => p.interval === 'yearly');

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount / 100);
    };

    const handleFinish = async () => {
        if (!userId) return;
        setSaving(true);
        setError('');
        try {
            const data = await apiCall<CreateBranchResponse>('/api/v1/branches', {
                method: 'POST',
                body: JSON.stringify({
                    name: gymName,
                    address: address || null,
                    user_id: userId,
                    billing_cycle: billingCycle,
                }),
            });

            // If Stripe checkout URL is returned, redirect to it
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
                return;
            }

            // If no Stripe (disabled), just complete onboarding
            onComplete();
        } catch (e) {
            console.error('Error creating branch:', e);
            setError('Error al crear el gimnasio. Intenta de nuevo.');
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white sm:bg-[#F9FAFB] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 flex justify-center">
                <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">EigenFit</span>
                </div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
                {/* Progress */}
                <div className="flex gap-2 mb-6 px-2">
                    {[0, 1].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    ))}
                </div>

                <div className="bg-white sm:border sm:border-slate-200 sm:rounded-lg sm:p-8">
                    {step === 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 mb-1">Tu gimnasio</h2>
                            <p className="text-sm text-slate-500 mb-6">Cuéntanos sobre tu negocio.</p>

                            <Input
                                label="Nombre del gimnasio / franquicia"
                                placeholder="Ej. FitLife Gym"
                                value={gymName}
                                onChange={(e) => setGymName(e.target.value)}
                                autoFocus
                            />
                            <Input
                                label="Dirección (opcional)"
                                placeholder="Ej. Av. Reforma 123, CDMX"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />

                            <div className="mt-6">
                                <Button
                                    onClick={() => { setError(''); setStep(1); }}
                                    disabled={!gymName.trim()}
                                    className="w-full justify-between"
                                >
                                    Siguiente
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 mb-1">Elige tu plan</h2>
                            <p className="text-sm text-slate-500 mb-6">Un solo plan, todo incluido. Cancela cuando quieras.</p>

                            <div className="space-y-3 mb-6">
                                {loadingPrices ? (
                                    <>
                                        <div className="w-full h-[72px] rounded-lg bg-slate-100 animate-pulse" />
                                        <div className="w-full h-[72px] rounded-lg bg-slate-100 animate-pulse" />
                                    </>
                                ) : (
                                    <>
                                        {monthlyPrice && (
                                            <button
                                                onClick={() => setBillingCycle('monthly')}
                                                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                                                    billingCycle === 'monthly'
                                                        ? 'border-blue-600 bg-blue-50/50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">Mensual</p>
                                                        <p className="text-sm text-slate-500">Pago mes a mes</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-slate-900">{formatPrice(monthlyPrice.amount, monthlyPrice.currency)}</p>
                                                        <p className="text-xs text-slate-400">/mes por sucursal</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )}

                                        {yearlyPrice && (
                                            <button
                                                onClick={() => setBillingCycle('yearly')}
                                                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                                                    billingCycle === 'yearly'
                                                        ? 'border-blue-600 bg-blue-50/50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">Anual</p>
                                                        <p className="text-sm text-slate-500">Ahorra 2 meses</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-slate-900">{formatPrice(yearlyPrice.amount, yearlyPrice.currency)}</p>
                                                        <p className="text-xs text-slate-400">/año por sucursal</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="space-y-3 mb-6 text-sm text-slate-500">
                                <div className="flex items-center gap-2"><Check size={14} className="text-blue-600" /> Miembros ilimitados</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-blue-600" /> Cobros automáticos</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-blue-600" /> Reportes y métricas</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-blue-600" /> Soporte prioritario</div>
                            </div>

                            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setStep(0)} className="!px-3">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={handleFinish}
                                    isLoading={saving}
                                    className="flex-1 justify-between"
                                >
                                    Continuar al pago
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Serás redirigido a Stripe para completar el pago de forma segura.
                </div>
            </div>
        </div>
    );
};
