import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    QrCode,
    Monitor,
    CheckCircle,
    LogIn,
    LogOut,
    Clock3,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { StreakLeaderboard, type StreakLeaderboardItem } from './visit/StreakLeaderboard';
import { useApi } from '../../../hooks/useApi';

interface MemberRecord {
    id: string;
    code: number;
    role: string;
    full_name: string;
}

interface AttendanceRecord {
    id: string;
    member_id: string;
    branch_id: string;
    check_in_time: string;
    check_out_time: string | null;
}

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

interface HourlyVisitPoint {
    hour: number;
    visits: number;
    label: string;
}

interface FeedbackData {
    type: 'in' | 'out';
    memberName: string;
    code: string;
}

interface VisitViewProps {
    branchId: string;
    onActivateKiosk?: () => void;
}

const MEXICO_CITY_TIMEZONE = 'America/Mexico_City';
const VISIT_CHART_START_HOUR = 5;
const VISIT_CHART_END_HOUR = 23;

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

const mexicoHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MEXICO_CITY_TIMEZONE,
    hour: '2-digit',
    hour12: false,
});


function getMexicoDateParam(date = new Date()): string {
    const parts = mexicoDatePartsFormatter.formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value ?? '0000';
    const month = parts.find(part => part.type === 'month')?.value ?? '01';
    const day = parts.find(part => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
}

function getMexicoHour(date: Date): number {
    const hourString = mexicoHourFormatter
        .formatToParts(date)
        .find(part => part.type === 'hour')?.value;
    const hour = Number.parseInt(hourString ?? '0', 10);
    return Number.isNaN(hour) ? 0 : hour;
}

function capitalizeFirst(text: string): string {
    return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

function buildHourlyVisitSeries(attendances: AttendanceRecord[]): HourlyVisitPoint[] {
    const byHour = Array.from(
        { length: VISIT_CHART_END_HOUR - VISIT_CHART_START_HOUR + 1 },
        (_, index) => {
            const hour = VISIT_CHART_START_HOUR + index;
            return {
                hour,
                visits: 0,
                label: `${hour.toString().padStart(2, '0')}:00`,
            };
        }
    );

    attendances.forEach(attendance => {
        const hour = getMexicoHour(new Date(attendance.check_in_time));
        if (hour >= VISIT_CHART_START_HOUR && hour <= VISIT_CHART_END_HOUR) {
            byHour[hour - VISIT_CHART_START_HOUR].visits += 1;
        }
    });

    return byHour;
}

function clampVisitHour(hour: number): number {
    return Math.min(VISIT_CHART_END_HOUR, Math.max(VISIT_CHART_START_HOUR, hour));
}

/**
 * Parse user input to determine role and numeric code.
 * "E-5" → { role: 'employee', code: 5 }
 * "310" → { role: 'member', code: 310 }
 */
function parseCodeInput(input: string): { role: string; code: number } | null {
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
    const [idInput, setIdInput] = useState('');
    const [feedback, setFeedback] = useState<FeedbackData | null>(null);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [todayAttendances, setTodayAttendances] = useState<AttendanceRecord[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState('');
    const [streakItems, setStreakItems] = useState<StreakLeaderboardItem[]>([]);
    const [streakLoading, setStreakLoading] = useState(false);
    const [streakError, setStreakError] = useState('');
    const [now, setNow] = useState(() => new Date());

    const closeFeedback = useCallback(() => {
        setFeedback(null);
    }, []);

    const showFeedback = (data: FeedbackData) => {
        setFeedback(data);
        setTimeout(() => setFeedback(null), 4000);
    };

    const fetchTodayAttendances = useCallback(async () => {
        if (!branchId) {
            return;
        }

        setStatsLoading(true);
        try {
            const todayInMexico = getMexicoDateParam();
            const attendances = await apiCall<AttendanceRecord[]>(
                `/api/v1/attendances?branch_id=${branchId}&attendance_date=${todayInMexico}&limit=200`
            );
            setTodayAttendances(attendances);
            setStatsError('');
        } catch (err) {
            console.error('Error fetching visit trend:', err);
            setStatsError('No se pudieron cargar las visitas del día.');
        } finally {
            setStatsLoading(false);
        }
    }, [apiCall, branchId]);

    const fetchStreakLeaderboard = useCallback(async () => {
        if (!branchId) {
            return;
        }

        setStreakLoading(true);
        try {
            const leaderboard = await apiCall<StreakLeaderboardResponse>(
                `/api/v1/attendances/leaderboard/streak?branch_id=${branchId}&limit=5`
            );

            const mappedItems: StreakLeaderboardItem[] = leaderboard.items.map(item => ({
                memberId: item.member_id,
                memberName: item.member_name,
                totalVisits: item.total_visits,
                streakDays: item.streak_days,
                rank: item.rank,
            }));

            setStreakItems(mappedItems);
            setStreakError('');
        } catch (err) {
            console.error('Error fetching streak leaderboard:', err);
            setStreakError('No se pudo cargar la racha histórica.');
        } finally {
            setStreakLoading(false);
        }
    }, [apiCall, branchId]);

    useEffect(() => {
        fetchTodayAttendances();
        fetchStreakLeaderboard();
    }, [fetchTodayAttendances, fetchStreakLeaderboard]);

    useEffect(() => {
        const refreshTimer = window.setInterval(() => {
            fetchTodayAttendances();
            fetchStreakLeaderboard();
        }, 60000);
        return () => window.clearInterval(refreshTimer);
    }, [fetchTodayAttendances, fetchStreakLeaderboard]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const hourlyVisits = useMemo(() => buildHourlyVisitSeries(todayAttendances), [todayAttendances]);
    const nowHourInMexico = useMemo(() => getMexicoHour(now), [now]);
    const currentHourIndex = clampVisitHour(nowHourInMexico) - VISIT_CHART_START_HOUR;
    const previousHourIndex = currentHourIndex > 0 ? currentHourIndex - 1 : currentHourIndex;
    const xLabelIndices = useMemo(() => {
        const indices = [0, 6, 12, hourlyVisits.length - 1];
        return Array.from(new Set(indices.filter(index => index >= 0 && index < hourlyVisits.length)));
    }, [hourlyVisits]);
    const totalVisitsToday = todayAttendances.length;
    const currentHourVisits = hourlyVisits[currentHourIndex]?.visits ?? 0;
    const previousHourVisits = hourlyVisits[previousHourIndex]?.visits ?? 0;

    const hourlyDelta = useMemo(() => {
        if (previousHourVisits === 0) {
            return currentHourVisits === 0 ? 0 : 100;
        }
        return Math.round(((currentHourVisits - previousHourVisits) / previousHourVisits) * 100);
    }, [currentHourVisits, previousHourVisits]);

    const trendDirection = hourlyDelta > 0 ? 'up' : hourlyDelta < 0 ? 'down' : 'flat';
    const TrendIcon = trendDirection === 'down'
        ? TrendingDown
        : trendDirection === 'flat'
        ? Minus
        : TrendingUp;

    const chartWidth = 330;
    const chartHeight = 130;
    const chartPaddingX = 10;
    const chartPaddingY = 12;
    const baselineY = chartHeight - chartPaddingY;
    const elapsedPoints = clampVisitHour(nowHourInMexico) - VISIT_CHART_START_HOUR + 1;
    const pointLimit = Math.min(hourlyVisits.length, Math.max(2, elapsedPoints));
    const maxHourlyVisits = Math.max(1, ...hourlyVisits.map(point => point.visits));
    const xStep = hourlyVisits.length > 1
        ? (chartWidth - chartPaddingX * 2) / (hourlyVisits.length - 1)
        : 0;

    const chartPoints = hourlyVisits.map((point, index) => ({
        ...point,
        x: chartPaddingX + index * xStep,
        y: baselineY - (point.visits / maxHourlyVisits) * (chartHeight - chartPaddingY * 2),
    }));

    const renderedPoints = chartPoints.slice(0, pointLimit);
    const linePath = renderedPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');
    const currentPoint = chartPoints[currentHourIndex] ?? chartPoints[0];

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
            // 1. Look up member by code + role + branch
            const endpoint = parsed.role === 'employee' ? 'employees' : 'members';
            const membersPage = await apiCall<{ items: MemberRecord[]; total: number }>(
                `/api/v1/${endpoint}?branch_id=${branchId}&search=${parsed.code}&limit=10`
            );

            const member = membersPage.items.find(m => m.code === parsed.code);
            if (!member) {
                setError(`No se encontró ${parsed.role === 'employee' ? 'empleado' : 'miembro'} con ID ${parsed.role === 'employee' ? 'E-' : ''}${parsed.code}.`);
                setTimeout(() => setError(''), 4000);
                return;
            }

            const displayCode = parsed.role === 'employee' ? `E-${parsed.code}` : String(parsed.code);

            // 2. Check if already checked in
            const currentAttendances = await apiCall<AttendanceRecord[]>(
                `/api/v1/attendances/current?branch_id=${branchId}`
            );

            const activeAttendance = currentAttendances.find(a => a.member_id === member.id);

            if (activeAttendance) {
                // Check out
                await apiCall(`/api/v1/attendances/${activeAttendance.id}/check-out`, {
                    method: 'POST',
                    body: JSON.stringify({}),
                });
                await Promise.all([fetchTodayAttendances(), fetchStreakLeaderboard()]);
                showFeedback({ type: 'out', memberName: member.full_name, code: displayCode });
            } else {
                // Check in
                await apiCall('/api/v1/attendances/check-in', {
                    method: 'POST',
                    body: JSON.stringify({
                        branch_id: branchId,
                        member_id: member.id,
                    }),
                });
                await Promise.all([fetchTodayAttendances(), fetchStreakLeaderboard()]);
                showFeedback({ type: 'in', memberName: member.full_name, code: displayCode });
            }
        } catch (err: any) {
            console.error('Error during check-in/out:', err);
            setError(`Error: ${err.message}`);
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

                            <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 mt-3 text-xs font-medium ${
                                trendDirection === 'up'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : trendDirection === 'down'
                                    ? 'bg-orange-50 border-orange-100 text-orange-700'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                                <TrendIcon size={12} />
                                <span className="tabular-nums">
                                    {hourlyDelta > 0 ? '+' : ''}
                                    {hourlyDelta}%
                                </span>
                                <span>vs hora anterior</span>
                            </div>
                        </div>

                        <div className="lg:border-l lg:border-slate-100 lg:pl-6">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 pt-3 pb-2">
                                <svg
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    className="w-full h-28"
                                    role="img"
                                    aria-label="Gráfica de visitas por hora"
                                >
                                    {[0.25, 0.5, 0.75].map(level => (
                                        <line
                                            key={level}
                                            x1={chartPaddingX}
                                            x2={chartWidth - chartPaddingX}
                                            y1={chartPaddingY + (chartHeight - chartPaddingY * 2) * level}
                                            y2={chartPaddingY + (chartHeight - chartPaddingY * 2) * level}
                                            stroke="#CBD5E1"
                                            strokeWidth="1"
                                            strokeDasharray="4 4"
                                        />
                                    ))}
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <circle
                                        cx={currentPoint.x}
                                        cy={currentPoint.y}
                                        r="4"
                                        fill="#10B981"
                                        stroke="white"
                                        strokeWidth="2"
                                    />
                                </svg>

                                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
                                    {xLabelIndices.map(index => (
                                        <span key={hourlyVisits[index].label}>{hourlyVisits[index].label}</span>
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
                            feedback.type === 'in'
                                ? 'bg-gradient-to-b from-green-50 to-white border-green-200'
                                : 'bg-gradient-to-b from-orange-50 to-white border-orange-200'
                        }`}>
                            <div className="pt-8 pb-6 text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                                    feedback.type === 'in'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-orange-100 text-orange-600'
                                }`}>
                                    {feedback.type === 'in' ? <LogIn size={32} /> : <LogOut size={32} />}
                                </div>
                                <h2 className={`text-2xl font-bold ${
                                    feedback.type === 'in' ? 'text-green-700' : 'text-orange-700'
                                }`}>
                                    {feedback.type === 'in' ? '¡Bienvenido!' : '¡Hasta Luego!'}
                                </h2>
                                <p className="text-slate-600 font-medium mt-1">{feedback.memberName}</p>
                                <p className="text-sm text-slate-400 mt-0.5">ID: {feedback.code}</p>
                            </div>

                            {feedback.type === 'in' ? (
                                <div className="px-6 pb-6">
                                    <div className="bg-white/60 rounded-xl p-4 text-center flex items-center justify-center gap-2">
                                        <CheckCircle size={16} className="text-green-500" />
                                        <p className="text-sm text-slate-600">Entrada registrada</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-6 pb-6">
                                    <div className="bg-white/60 rounded-xl p-4 text-center">
                                        <p className="text-sm text-slate-500">Salida registrada</p>
                                        <p className="text-sm text-slate-400 mt-1">¡Te esperamos pronto!</p>
                                    </div>
                                </div>
                            )}

                            <div className="h-1 bg-slate-100">
                                <div
                                    className={`h-full ${feedback.type === 'in' ? 'bg-green-400' : 'bg-orange-400'}`}
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
