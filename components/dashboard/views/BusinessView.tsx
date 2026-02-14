import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Users,
    UserPlus,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    Clock,
    Loader2,
} from 'lucide-react';
import { useApi } from '../../../hooks/useApi';

interface BusinessDashboardResponse {
    generated_at: string;
    kpis: {
        month_revenue: number;
        month_revenue_change_pct: number;
        active_members: number;
        total_members: number;
        active_members_change_pct: number;
        new_registrations: number;
        new_registrations_change_pct: number;
        retention_rate_pct: number;
        retention_rate_change_pct: number;
    };
    membership_summary: {
        active: number;
        expiring_7_days: number;
        overdue: number;
        canceled: number;
    };
    weekly_attendance: Array<{
        date: string;
        day_label: string;
        visits: number;
    }>;
    popular_plans: Array<{
        plan_id: string;
        plan_name: string;
        members: number;
        pct: number;
        revenue: number;
    }>;
    recent_payments: Array<{
        membership_id: string;
        member_name: string;
        plan_name: string;
        amount: number;
        payment_date: string;
    }>;
    inactive_members: Array<{
        member_id: string;
        member_name: string;
        last_visit: string | null;
        membership_name: string | null;
        days_away: number;
    }>;
}

interface BusinessViewProps {
    branchId: string;
}

const cardClass = 'bg-white rounded-lg border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
});

const formatTrend = (value: number): string => {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
};

const formatShortDate = (iso: string | null): string => {
    if (!iso) return 'Sin visitas';
    const date = new Date(iso);
    return shortDateFormatter.format(date);
};

export const BusinessView: React.FC<BusinessViewProps> = ({ branchId }) => {
    const { apiCall } = useApi();
    const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiCall<BusinessDashboardResponse>(
                `/api/v1/business/dashboard?branch_id=${branchId}&inactive_days=30&popular_plans_limit=4&recent_payments_limit=5&inactive_members_limit=5`
            );
            setDashboard(data);
            setError('');
        } catch (err) {
            console.error('Error loading business dashboard:', err);
            setError('No se pudo cargar el dashboard de negocio.');
        } finally {
            setLoading(false);
        }
    }, [apiCall, branchId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const kpis = useMemo(() => {
        if (!dashboard) return [];
        return [
            {
                label: 'Ingresos del Mes',
                value: currencyFormatter.format(dashboard.kpis.month_revenue),
                trend: formatTrend(dashboard.kpis.month_revenue_change_pct),
                positive: dashboard.kpis.month_revenue_change_pct >= 0,
                icon: DollarSign,
                color: 'text-green-600',
                bg: 'bg-green-50',
                subtitle: undefined as string | undefined,
            },
            {
                label: 'Miembros Activos',
                value: dashboard.kpis.active_members.toLocaleString('es-MX'),
                subtitle: `de ${dashboard.kpis.total_members.toLocaleString('es-MX')} totales`,
                trend: formatTrend(dashboard.kpis.active_members_change_pct),
                positive: dashboard.kpis.active_members_change_pct >= 0,
                icon: Users,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
            },
            {
                label: 'Nuevos Registros',
                value: dashboard.kpis.new_registrations.toLocaleString('es-MX'),
                subtitle: 'este mes',
                trend: formatTrend(dashboard.kpis.new_registrations_change_pct),
                positive: dashboard.kpis.new_registrations_change_pct >= 0,
                icon: UserPlus,
                color: 'text-violet-600',
                bg: 'bg-violet-50',
            },
            {
                label: 'Tasa de Retencion',
                value: `${Math.round(dashboard.kpis.retention_rate_pct)}%`,
                subtitle: 'vs mes anterior',
                trend: formatTrend(dashboard.kpis.retention_rate_change_pct),
                positive: dashboard.kpis.retention_rate_change_pct >= 0,
                icon: ShieldCheck,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
            },
        ];
    }, [dashboard]);

    const membershipSummary = useMemo(() => {
        if (!dashboard) return [];
        return [
            { label: 'Activas', count: dashboard.membership_summary.active, color: 'bg-green-500', barColor: 'bg-green-100' },
            { label: 'Por vencer (7 dias)', count: dashboard.membership_summary.expiring_7_days, color: 'bg-amber-500', barColor: 'bg-amber-100' },
            { label: 'Vencidas', count: dashboard.membership_summary.overdue, color: 'bg-red-500', barColor: 'bg-red-100' },
            { label: 'Canceladas', count: dashboard.membership_summary.canceled, color: 'bg-slate-400', barColor: 'bg-slate-100' },
        ];
    }, [dashboard]);

    const weeklyAttendance = dashboard?.weekly_attendance ?? [];
    const popularPlans = dashboard?.popular_plans ?? [];
    const recentPayments = dashboard?.recent_payments ?? [];
    const inactiveMembers = dashboard?.inactive_members ?? [];

    const maxAttendance = Math.max(1, ...weeklyAttendance.map(day => day.visits));
    const totalMemberships = membershipSummary.reduce((sum, membership) => sum + membership.count, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                Cargando dashboard...
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-5xl mx-auto py-10">
                <div className={`${cardClass} p-6`}>
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={i} className={`${cardClass} p-5`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                                    <Icon size={16} className={kpi.color} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${kpi.positive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                    {kpi.positive ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                                    {kpi.trend}
                                </span>
                            </div>
                            {kpi.subtitle && <p className="text-xs text-slate-400 mt-1">{kpi.subtitle}</p>}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${cardClass} p-6`}>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Resumen de Membresias</h3>
                    <div className="space-y-3">
                        {membershipSummary.map((item, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-slate-600">{item.label}</span>
                                    <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                                </div>
                                <div className={`h-2 rounded-full ${item.barColor}`}>
                                    <div
                                        className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                                        style={{ width: `${totalMemberships > 0 ? (item.count / totalMemberships) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`${cardClass} p-6`}>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Asistencia Semanal</h3>
                    <div className="flex items-end justify-between gap-2 h-40">
                        {weeklyAttendance.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-slate-500">{day.visits}</span>
                                <div className="w-full bg-slate-100 rounded-t-md relative" style={{ height: '120px' }}>
                                    <div
                                        className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all duration-500"
                                        style={{ height: `${(day.visits / maxAttendance) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{day.day_label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${cardClass} p-6`}>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Planes Populares</h3>
                    <div className="space-y-4">
                        {popularPlans.map((plan) => (
                            <div key={plan.plan_id} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-900">{plan.plan_name}</span>
                                        <span className="text-sm text-slate-500">{currencyFormatter.format(plan.revenue)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${plan.pct}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400 w-20 text-right">
                                            {plan.members} ({Math.round(plan.pct)}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {popularPlans.length === 0 && (
                            <p className="text-sm text-slate-400">Sin ventas registradas este mes.</p>
                        )}
                    </div>
                </div>

                <div className={`${cardClass} p-6`}>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Pagos Recientes</h3>
                    <div className="space-y-3">
                        {recentPayments.map((payment) => (
                            <div key={payment.membership_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {payment.member_name.split(' ').map(name => name[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{payment.member_name}</p>
                                        <p className="text-xs text-slate-400">{payment.plan_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">{currencyFormatter.format(payment.amount)}</p>
                                    <p className="text-xs text-slate-400">{formatShortDate(payment.payment_date)}</p>
                                </div>
                            </div>
                        ))}
                        {recentPayments.length === 0 && (
                            <p className="text-sm text-slate-400">Sin pagos recientes.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className={`${cardClass} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Miembros Inactivos</h3>
                    <span className="text-xs text-slate-400">sin visita en 30+ dias</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                                <th className="pb-2 font-medium">Nombre</th>
                                <th className="pb-2 font-medium">Ultima Visita</th>
                                <th className="pb-2 font-medium">Membresia</th>
                                <th className="pb-2 font-medium text-right">Dias sin asistir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inactiveMembers.map((member) => (
                                <tr key={member.member_id} className="border-b border-slate-50 last:border-0">
                                    <td className="py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-600">
                                                {member.member_name.split(' ').map(name => name[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="font-medium text-slate-900">{member.member_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-slate-500">{formatShortDate(member.last_visit)}</td>
                                    <td className="py-2.5 text-slate-500">{member.membership_name || 'Sin membresia'}</td>
                                    <td className="py-2.5 text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            member.days_away >= 30 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            <Clock size={10} />
                                            {member.days_away}d
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {inactiveMembers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-4 text-sm text-slate-400 text-center">
                                        No hay miembros inactivos para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
