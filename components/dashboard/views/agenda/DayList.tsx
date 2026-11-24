import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatLocalTime, localDateOf } from '../../../../lib/agenda/time';
import type { ClassSessionSummary, LocalDate } from '../../../../lib/agenda/types';
import { getOccupancyState, OccupancyBadge, type OccupancyState } from './OccupancyBadge';
import { formatSessionAccessibleLabel } from './SessionBlock';

export interface DayListProps {
    date: LocalDate;
    timezone: string;
    sessions: ClassSessionSummary[];
    selectedSessionId?: string;
    onSelectSession: (sessionId: string) => void;
    now?: Date;
}

const STATE_STYLES: Record<OccupancyState, { border: string; bar: string; bg: string }> = {
    available: {
        border: 'border-l-emerald-500',
        bar: 'bg-emerald-500',
        bg: 'bg-white hover:bg-slate-50/70',
    },
    almost_full: {
        border: 'border-l-amber-500',
        bar: 'bg-amber-500',
        bg: 'bg-white hover:bg-slate-50/70',
    },
    full: {
        border: 'border-l-rose-500',
        bar: 'bg-rose-500',
        bg: 'bg-white hover:bg-slate-50/70',
    },
    cancelled: {
        border: 'border-l-slate-400',
        bar: 'bg-slate-300',
        bg: 'bg-slate-50/70 hover:bg-slate-100/70',
    },
};

export const DayList: React.FC<DayListProps> = ({
    date,
    timezone,
    sessions,
    selectedSessionId,
    onSelectSession,
    now,
}) => {
    const nowMs = (now ?? new Date()).getTime();

    const daySessions = useMemo(() => {
        return sessions
            .filter((session) => localDateOf(session.starts_at, timezone) === date)
            .sort(
                (a, b) =>
                    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() ||
                    a.title.localeCompare(b.title, 'es-MX'),
            );
    }, [date, sessions, timezone]);

    if (daySessions.length === 0) {
        return (
            <div className="bg-white border border-slate-100 rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] px-6 py-12 text-center flex flex-col items-center gap-2">
                <CalendarDays size={24} className="text-slate-300" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700">No hay clases programadas este día</p>
                <p className="text-xs text-slate-400">Selecciona otro día o ajusta los filtros.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-2.5" aria-label="Clases del día">
            {daySessions.map((session) => {
                const state = getOccupancyState(session.booked_count, session.capacity, session.status);
                const styles = STATE_STYLES[state];
                const isCancelled = state === 'cancelled';
                const isPast = new Date(session.ends_at).getTime() <= nowMs;
                const isSelected = session.id === selectedSessionId;
                const startTime = formatLocalTime(session.starts_at, timezone);
                const endTime = formatLocalTime(session.ends_at, timezone);
                const fillPct =
                    isCancelled || session.capacity <= 0
                        ? 0
                        : Math.min(100, Math.round((session.booked_count / session.capacity) * 100));
                const accessibleLabel = formatSessionAccessibleLabel(session, timezone, isPast);

                return (
                    <li key={session.id}>
                        <button
                            type="button"
                            onClick={() => onSelectSession(session.id)}
                            aria-label={accessibleLabel}
                            aria-pressed={isSelected}
                            className={`w-full text-left rounded-lg border border-slate-200/80 border-l-4 p-3.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${styles.border} ${styles.bg} ${
                                isPast ? 'opacity-65 hover:opacity-90' : ''
                            } ${isSelected ? 'ring-2 ring-slate-900 border-slate-300' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p
                                        aria-hidden="true"
                                        className="text-xs font-medium text-slate-500 tabular-nums"
                                    >
                                        {startTime}–{endTime}
                                    </p>
                                    <p
                                        aria-hidden="true"
                                        className={`mt-0.5 text-sm font-semibold truncate ${
                                            isCancelled ? 'line-through text-slate-500' : 'text-slate-900'
                                        }`}
                                    >
                                        {session.title}
                                    </p>
                                    <p aria-hidden="true" className="mt-1 text-xs text-slate-500 truncate">
                                        {session.coach.full_name} · {session.room.name}
                                    </p>
                                    {isCancelled && session.cancel_reason && (
                                        <p aria-hidden="true" className="mt-1 text-xs text-slate-500 truncate">
                                            Motivo: {session.cancel_reason}
                                        </p>
                                    )}
                                </div>

                                <div aria-hidden="true" className="shrink-0">
                                    <OccupancyBadge
                                        booked={session.booked_count}
                                        capacity={session.capacity}
                                        status={session.status}
                                    />
                                </div>
                            </div>

                            <div
                                aria-hidden="true"
                                className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
                            >
                                <div
                                    className={`h-full rounded-full transition-all ${styles.bar}`}
                                    style={{ width: `${fillPct}%` }}
                                />
                            </div>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};
