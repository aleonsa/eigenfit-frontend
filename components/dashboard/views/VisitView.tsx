import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    QrCode,
    Monitor,
    CheckCircle,
    Flame,
    LogIn,
    LogOut,
    Clock3,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/Button';
import { StreakLeaderboard, type StreakLeaderboardItem } from './visit/StreakLeaderboard';
import { useApi } from '../../../hooks/useApi';

interface StreakLeaderboardItemRecord {
    member_id: string;
    member_name: string;
    member_code: number;
    total_visits: number;
    streak_days: number;
    rank: number;
}

interface StreakLeaderboardResponse {
    items: StreakLeaderboardItemRecord[];
}

interface AttendanceTimeBucket {
    start_minutes: number;
    visits: number;
}

interface DailyAttendanceStatsResponse {
    member_visits: number;
    buckets: AttendanceTimeBucket[];
}

interface AttendanceScanResponse {
    action: 'check_in' | 'check_out';
    attendance_id: string;
    check_in_time: string;
    check_out_time: string | null;
    member_id: string;
    member_name: string;
    member_code: number;
    member_role: 'member' | 'employee';
    member_has_active_membership: boolean | null;
    streak_days: number;
    stats_date: string;
    daily_stats: DailyAttendanceStatsResponse;
}

interface VisitTimeSlotPoint {
    minutesOfDay: number;
    visits: number;
    label: string;
}

interface FeedbackData {
    type: 'in' | 'out';
    memberName: string;
    code: string;
    memberType: 'member' | 'employee';
    isActiveMembership?: boolean | null;
    streakDays?: number | null;
}

interface VisitViewProps {
    branchId: string;
    onActivateKiosk?: () => void;
}

const MEXICO_CITY_TIMEZONE = 'America/Mexico_City';
const VISIT_CHART_START_MINUTES = 5 * 60;
const VISIT_CHART_END_MINUTES = 23 * 60;
const VISIT_SLOT_MINUTES = 30;

const mexicoDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MEXICO_CITY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const mexicoClockFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_CITY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const mexicoDateLabelFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_CITY_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
});

const mexicoTimePartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MEXICO_CITY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});


function getMexicoDateParam(date = new Date()): string {
    const parts = mexicoDatePartsFormatter.formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value ?? '0000';
    const month = parts.find(part => part.type === 'month')?.value ?? '01';
    const day = parts.find(part => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
}

function getMexicoMinutesOfDay(date: Date): number {
    const parts = mexicoTimePartsFormatter.formatToParts(date);
    const hour = Number.parseInt(parts.find(part => part.type === 'hour')?.value ?? '0', 10);
    const minute = Number.parseInt(parts.find(part => part.type === 'minute')?.value ?? '0', 10);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return 0;
    }

    return hour * 60 + minute;
}

function capitalizeFirst(text: string): string {
    return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

function formatHourMinuteLabel(minutesOfDay: number): string {
    const hour = Math.floor(minutesOfDay / 60);
    const minute = minutesOfDay % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function buildHalfHourVisitSeries(buckets: AttendanceTimeBucket[]): VisitTimeSlotPoint[] {
    const visitsByStartMinutes = new Map(
        buckets.map(bucket => [bucket.start_minutes, bucket.visits])
    );
    const slots = Array.from(
        {
            length:
                Math.floor((VISIT_CHART_END_MINUTES - VISIT_CHART_START_MINUTES) / VISIT_SLOT_MINUTES) + 1,
        },
        (_, index) => {
            const minutesOfDay = VISIT_CHART_START_MINUTES + index * VISIT_SLOT_MINUTES;
            return {
                minutesOfDay,
                visits: visitsByStartMinutes.get(minutesOfDay) ?? 0,
                label: formatHourMinuteLabel(minutesOfDay),
            };
        }
    );

    return slots;
}

function clampVisitMinutes(minutesOfDay: number): number {
    return Math.min(VISIT_CHART_END_MINUTES, Math.max(VISIT_CHART_START_MINUTES, minutesOfDay));
}

/**
 * Parse user input to determine role and numeric code.
 * "E-5" → { role: 'employee', code: 5 }
 * "310" → { role: 'member', code: 310 }
 */
function parseCodeInput(input: string): { role: 'member' | 'employee'; code: number } | null {
    const trimmed = input.trim().toUpperCase();
    if (trimmed.startsWith('E-')) {
        const num = parseInt(trimmed.slice(2), 10);
        if (isNaN(num)) return null;
        return { role: 'employee', code: num };
    }
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return null;
    return { role: 'member', code: num };
}

export const VisitView: React.FC<VisitViewProps> = ({ branchId, onActivateKiosk }) => {
    const { apiCall } = useApi();
    const queryClient = useQueryClient();
    const [idInput, setIdInput] = useState('');
    const [feedback, setFeedback] = useState<FeedbackData | null>(null);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [now, setNow] = useState(() => new Date());

    const closeFeedback = useCallback(() => {
        setFeedback(null);
    }, []);

    const showFeedback = (data: FeedbackData) => {
        setFeedback(data);
        setTimeout(() => setFeedback(null), 4000);
    };

    const todayInMexico = getMexicoDateParam();

    const {
        data: dailyStats,
        isLoading: statsLoading,
        error: statsQueryError,
    } = useQuery({
        queryKey: ['visit-attendances', branchId, todayInMexico],
        queryFn: () => apiCall<DailyAttendanceStatsResponse>(
            `/api/v1/attendances/daily-stats?branch_id=${branchId}&attendance_date=${todayInMexico}`
        ),
        enabled: !!branchId,
        // Local scans update this cache directly; polling picks up other devices.
        refetchInterval: 5 * 60 * 1000,
    });
    const statsError = statsQueryError ? 'No se pudieron cargar las visitas del día.' : '';

    const {
        data: streakData,
        isLoading: streakLoading,
        error: streakQueryError,
    } = useQuery({
        queryKey: ['visit-streaks', branchId],
        queryFn: async () => {
            const leaderboard = await apiCall<StreakLeaderboardResponse>(
                `/api/v1/attendances/leaderboard/streak?branch_id=${branchId}&limit=5`
            );
            return leaderboard.items.map(item => ({
                memberId: item.member_id,
                memberName: item.member_name,
                totalVisits: item.total_visits,
                streakDays: item.streak_days,
                rank: item.rank,
            }));
        },
        enabled: !!branchId,
        refetchInterval: 15 * 60 * 1000,
    });
    const streakItems: StreakLeaderboardItem[] = streakData ?? [];
    const streakError = streakQueryError ? 'No se pudo cargar la racha histórica.' : '';

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const halfHourVisits = useMemo(
        () => buildHalfHourVisitSeries(dailyStats?.buckets ?? []),
        [dailyStats]
    );
    const nowMinutesInMexico = useMemo(() => getMexicoMinutesOfDay(now), [now]);
    const currentSlotStartMinutes =
        Math.floor(clampVisitMinutes(nowMinutesInMexico) / VISIT_SLOT_MINUTES) * VISIT_SLOT_MINUTES;
    const currentSlotIndex = Math.floor(
        (currentSlotStartMinutes - VISIT_CHART_START_MINUTES) / VISIT_SLOT_MINUTES
    );
    const previousSlotIndex = currentSlotIndex > 0 ? currentSlotIndex - 1 : currentSlotIndex;
    const xLabelIndices = useMemo(() => {
        const everyThreeHoursInSlots = (3 * 60) / VISIT_SLOT_MINUTES;
        const indices: number[] = [0];

        for (let index = everyThreeHoursInSlots; index < halfHourVisits.length; index += everyThreeHoursInSlots) {
            indices.push(index);
        }

        indices.push(halfHourVisits.length - 1);
        return Array.from(new Set(indices.filter(index => index >= 0 && index < halfHourVisits.length)));
    }, [halfHourVisits]);
    const totalVisitsToday = dailyStats?.member_visits ?? 0;
    const currentSlotVisits = halfHourVisits[currentSlotIndex]?.visits ?? 0;
    const previousSlotVisits = halfHourVisits[previousSlotIndex]?.visits ?? 0;

    const slotDelta = useMemo(() => {
        if (previousSlotVisits === 0) {
            return currentSlotVisits === 0 ? 0 : 100;
        }
        return Math.round(((currentSlotVisits - previousSlotVisits) / previousSlotVisits) * 100);
    }, [currentSlotVisits, previousSlotVisits]);

    const trendDirection = slotDelta > 0 ? 'up' : slotDelta < 0 ? 'down' : 'flat';
    const TrendIcon = trendDirection === 'down'
        ? TrendingDown
        : trendDirection === 'flat'
        ? Minus
        : TrendingUp;

    const chartWidth = 330;
    const chartHeight = 140;
    const chartPaddingLeft = 34;
    const chartPaddingRight = 10;
    const chartPaddingTop = 12;
    const chartPaddingBottom = 14;
    const baselineY = chartHeight - chartPaddingBottom;
    const elapsedPoints = currentSlotIndex + 1;
    const pointLimit = Math.min(halfHourVisits.length, Math.max(2, elapsedPoints));
    const observedMaxSlotVisits = Math.max(0, ...halfHourVisits.map(point => point.visits));
    const yTicks = observedMaxSlotVisits <= 3
        ? Array.from({ length: Math.max(2, observedMaxSlotVisits + 1) }, (_, index) => index)
        : (() => {
            const yTickCount = 4;
            const yTickStep = Math.max(1, Math.ceil(observedMaxSlotVisits / (yTickCount - 1)));
            return Array.from({ length: yTickCount }, (_, index) => index * yTickStep);
        })();
    const yScaleMax = yTicks[yTicks.length - 1] || 1;
    const xStep = halfHourVisits.length > 1
        ? (chartWidth - chartPaddingLeft - chartPaddingRight) / (halfHourVisits.length - 1)
        : 0;

    const chartPoints = halfHourVisits.map((point, index) => ({
        ...point,
        x: chartPaddingLeft + index * xStep,
        y:
            baselineY
            - (point.visits / yScaleMax) * (chartHeight - chartPaddingTop - chartPaddingBottom),
    }));

    const renderedPoints = chartPoints.slice(0, pointLimit);
    const linePath = renderedPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');
    const currentPoint = chartPoints[currentSlotIndex] ?? chartPoints[0];

    const mexicoClock = useMemo(() => mexicoClockFormatter.format(now), [now]);
    const mexicoDateLabel = useMemo(
        () => capitalizeFirst(mexicoDateLabelFormatter.format(now)),
        [now]
    );

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseCodeInput(idInput);
        if (!parsed) {
            setError('ID inválido. Usa un número (ej: 310) o E-número para empleados (ej: E-5).');
            setIdInput('');
            setTimeout(() => setError(''), 4000);
            return;
        }

        setProcessing(true);
        setError('');
        setIdInput('');

        try {
            const statsKeyPrefix = ['visit-attendances', branchId];
            await queryClient.cancelQueries({ queryKey: statsKeyPrefix });
            const scan = await apiCall<AttendanceScanResponse>(
                `/api/v1/attendances/scan?branch_id=${branchId}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        role: parsed.role,
                        code: parsed.code,
                    }),
                }
            );
            const displayCode = scan.member_role === 'employee'
                ? `E-${scan.member_code}`
                : String(scan.member_code);
            await queryClient.cancelQueries({ queryKey: statsKeyPrefix });
            queryClient.setQueryData<DailyAttendanceStatsResponse>(
                ['visit-attendances', branchId, scan.stats_date],
                scan.daily_stats
            );

            showFeedback({
                type: scan.action === 'check_in' ? 'in' : 'out',
                memberName: scan.member_name,
                code: displayCode,
                memberType: scan.member_role,
                isActiveMembership: scan.member_has_active_membership,
                streakDays: scan.member_role === 'member' ? scan.streak_days : null,
            });
        } catch (err: unknown) {
            console.error('Error during check-in/out:', err);
            void queryClient.invalidateQueries({ queryKey: ['visit-attendances', branchId] });
            const message = err instanceof Error ? err.message : '';
            const notFoundMessage = parsed.role === 'employee'
                ? `No se encontró empleado con ID E-${parsed.code}.`
                : `No se encontró miembro con ID ${parsed.code}.`;
            setError(message.includes('404') ? notFoundMessage : 'No se pudo registrar la visita. Intenta nuevamente.');
            setTimeout(() => setError(''), 4000);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                {/* Register */}
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center h-full xl:min-h-[420px]">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Registrar Visita</h2>
                    <p className="text-slate-500 mb-8">Ingresa tu ID para registrar tu entrada o salida.</p>

                    <form onSubmit={handleCheck} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Ej: 310 o E-5"
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            className="w-full text-center text-xl font-semibold tracking-wide px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                            autoFocus
                            disabled={processing}
                        />
                        <Button type="submit" className="w-full !py-3 !text-base shadow-none" disabled={processing}>
                            {processing ? 'Procesando...' : 'Registrar'}
                        </Button>
                    </form>

                    {error && (
                        <p className="mt-4 text-sm text-red-500 animate-in fade-in duration-200">
                            {error}
                        </p>
                    )}

                    <p className="mt-6 text-xs text-slate-400">
                        Miembros: número directo · Empleados: E- seguido del número
                    </p>
                </div>

                {/* Streaks */}
                <div className="h-full xl:min-h-[420px]">
                    <StreakLeaderboard
                        className="h-full"
                        items={streakItems}
                        loading={streakLoading}
                        error={streakError}
                    />
                </div>

                {/* Visits Today: full width and compact height */}
                <div className="xl:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-[200px_260px_minmax(0,1fr)] gap-5 lg:gap-6 items-center">
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Visitas Hoy</p>
                            <p className="mt-1 text-5xl font-bold tracking-tight text-slate-900 leading-none">
                                {statsLoading && totalVisitsToday === 0 ? '—' : totalVisitsToday}
                            </p>
                        </div>

                        <div className="lg:border-l lg:border-slate-100 lg:pl-6">
                            <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                <Clock3 size={12} />
                                Hora Centro de México
                            </div>
                            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                                {mexicoClock}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{mexicoDateLabel}</p>
                        </div>

                        <div className="lg:border-l lg:border-slate-100 lg:pl-6">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 pt-3 pb-2">
                                <svg
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    className="w-full h-28"
                                    role="img"
                                    aria-label="Gráfica de visitas cada media hora"
                                >
                                    {yTicks.map((tickValue, index) => {
                                        const y =
                                            baselineY
                                            - (tickValue / yScaleMax) * (chartHeight - chartPaddingTop - chartPaddingBottom);
                                        return (
                                            <g key={tickValue}>
                                                <line
                                                    x1={chartPaddingLeft}
                                                    x2={chartWidth - chartPaddingRight}
                                                    y1={y}
                                                    y2={y}
                                                    stroke="#CBD5E1"
                                                    strokeWidth="1"
                                                    strokeDasharray={index === 0 ? undefined : '4 4'}
                                                />
                                                <text
                                                    x={chartPaddingLeft - 6}
                                                    y={y + 3}
                                                    textAnchor="end"
                                                    fontSize="10"
                                                    fill="#64748B"
                                                >
                                                    {tickValue}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    <line
                                        x1={chartPaddingLeft}
                                        x2={chartPaddingLeft}
                                        y1={chartPaddingTop}
                                        y2={baselineY}
                                        stroke="#CBD5E1"
                                        strokeWidth="1"
                                    />
                                    <line
                                        x1={chartPaddingLeft}
                                        x2={chartWidth - chartPaddingRight}
                                        y1={baselineY}
                                        y2={baselineY}
                                        stroke="#CBD5E1"
                                        strokeWidth="1"
                                    />
                                    {renderedPoints.length > 0 && (
                                        <path
                                            d={linePath}
                                            fill="none"
                                            stroke="#10B981"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                    {currentPoint && (
                                        <circle
                                            cx={currentPoint.x}
                                            cy={currentPoint.y}
                                            r="4"
                                            fill="#10B981"
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    )}
                                </svg>

                                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
                                    {xLabelIndices.map(index => (
                                        <span key={halfHourVisits[index].label}>{halfHourVisits[index].label}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {statsError && (
                        <p className="mt-3 text-xs text-orange-600">{statsError}</p>
                    )}
                </div>
            </div>

            {onActivateKiosk && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={onActivateKiosk}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                    >
                        <Monitor size={16} />
                        Activar Modo Kiosco
                    </button>
                </div>
            )}

            {/* Check-in/out feedback overlay */}
            {feedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={closeFeedback}
                    />
                    <div className="relative w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className={`rounded-2xl border shadow-xl overflow-hidden ${
                            feedback.type === 'in' && feedback.memberType === 'member' && feedback.isActiveMembership === false
                                ? 'bg-gradient-to-b from-red-100 to-red-50 border-red-300'
                                : feedback.type === 'in'
                                ? 'bg-gradient-to-b from-green-50 to-white border-green-200'
                                : 'bg-gradient-to-b from-orange-50 to-white border-orange-200'
                        }`}>
                            <div className="pt-8 pb-6 text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                                    feedback.type === 'in' && feedback.memberType === 'member' && feedback.isActiveMembership === false
                                        ? 'bg-red-200 text-red-700'
                                        : feedback.type === 'in'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-orange-100 text-orange-600'
                                }`}>
                                    {feedback.type === 'in' ? <LogIn size={32} /> : <LogOut size={32} />}
                                </div>
                                <h2 className={`text-2xl font-bold ${
                                    feedback.type === 'in' && feedback.memberType === 'member' && feedback.isActiveMembership === false
                                        ? 'text-red-700'
                                        : feedback.type === 'in'
                                        ? 'text-green-700'
                                        : 'text-orange-700'
                                }`}>
                                    {feedback.type === 'in' ? '¡Bienvenido!' : '¡Hasta Luego!'}
                                </h2>
                                <p className="text-slate-600 font-medium mt-1">{feedback.memberName}</p>
                                <p className="text-sm text-slate-400 mt-0.5">ID: {feedback.code}</p>
                            </div>

                            {feedback.type === 'in' ? (
                                <div className="px-6 pb-6">
                                    {feedback.memberType === 'member' ? (
                                        <div className="space-y-3">
                                            <div className={`rounded-xl border p-4 ${
                                                feedback.isActiveMembership
                                                    ? 'bg-emerald-50 border-emerald-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    {feedback.isActiveMembership ? (
                                                        <CheckCircle size={16} className="text-emerald-600" />
                                                    ) : (
                                                        <AlertTriangle size={16} className="text-red-600" />
                                                    )}
                                                    <p className={`text-sm font-semibold ${
                                                        feedback.isActiveMembership ? 'text-emerald-700' : 'text-red-700'
                                                    }`}>
                                                        {feedback.isActiveMembership ? 'Membresia activa' : 'Membresia inactiva'}
                                                    </p>
                                                </div>
                                                {!feedback.isActiveMembership && (
                                                    <p className="mt-2 text-sm font-bold text-red-700">
                                                        Acercate a recepcion para renovar tu membresia.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="bg-white/80 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                                    <Flame size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Tu racha actual</p>
                                                    <p className="text-lg font-bold text-slate-900">
                                                        {feedback.streakDays ?? 0} dias
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/60 rounded-xl p-4 text-center flex items-center justify-center gap-2">
                                            <CheckCircle size={16} className="text-green-500" />
                                            <p className="text-sm text-slate-600">Entrada registrada</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="px-6 pb-6">
                                    {feedback.memberType === 'member' ? (
                                        <div className="space-y-3">
                                            <div className="bg-white/80 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                                    <Flame size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Tu racha actual</p>
                                                    <p className="text-lg font-bold text-slate-900">
                                                        {feedback.streakDays ?? 0} dias
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/60 rounded-xl p-4 text-center">
                                                <p className="text-sm text-slate-500">Salida registrada</p>
                                                <p className="text-sm text-slate-400 mt-1">¡Te esperamos pronto!</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/60 rounded-xl p-4 text-center">
                                            <p className="text-sm text-slate-500">Salida registrada</p>
                                            <p className="text-sm text-slate-400 mt-1">¡Te esperamos pronto!</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="h-1 bg-slate-100">
                                <div
                                    className={`h-full ${
                                        feedback.type === 'in' && feedback.memberType === 'member' && feedback.isActiveMembership === false
                                            ? 'bg-red-500'
                                            : feedback.type === 'in'
                                            ? 'bg-green-400'
                                            : 'bg-orange-400'
                                    }`}
                                    style={{ animation: 'shrink-width 4s linear forwards' }}
                                />
                            </div>
                            <style>{`
                                @keyframes shrink-width {
                                    from { width: 100%; }
                                    to { width: 0%; }
                                }
                            `}</style>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
