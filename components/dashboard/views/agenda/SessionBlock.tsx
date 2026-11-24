import React from 'react';
import { formatLocalTime } from '../../../../lib/agenda/time';
import type { ClassSessionSummary } from '../../../../lib/agenda/types';
import { getOccupancyState, type OccupancyState } from './OccupancyBadge';

export interface SessionBlockProps {
    session: ClassSessionSummary;
    timezone: string;
    isSelected?: boolean;
    isPast?: boolean;
    compact?: boolean;
    onSelect: (sessionId: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

const BLOCK_STYLES: Record<OccupancyState, { surface: string; count: string }> = {
    available: {
        surface: 'bg-emerald-50/75 border-emerald-200/90 border-l-emerald-500 hover:bg-emerald-50',
        count: 'text-emerald-700',
    },
    almost_full: {
        surface: 'bg-amber-50/75 border-amber-200/90 border-l-amber-500 hover:bg-amber-50',
        count: 'text-amber-700',
    },
    full: {
        surface: 'bg-rose-50/75 border-rose-200/90 border-l-rose-500 hover:bg-rose-50',
        count: 'text-rose-700',
    },
    cancelled: {
        surface: 'bg-slate-50 border-slate-200 border-l-slate-400 hover:bg-slate-100',
        count: 'text-slate-500',
    },
};

export function formatSessionAccessibleLabel(
    session: ClassSessionSummary,
    timezone: string,
    isPast: boolean,
): string {
    const start = new Date(session.starts_at);
    const dayLabel = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        timeZone: timezone,
    }).format(start);
    const startTime = formatLocalTime(session.starts_at, timezone).replace(/^0(\d:)/, '$1');
    const state = getOccupancyState(session.booked_count, session.capacity, session.status);

    if (state === 'cancelled') {
        return `${session.title}, ${dayLabel} ${startTime}, cancelada`;
    }

    const placeWord = session.capacity === 1 ? 'lugar' : 'lugares';
    const occupancy = `${session.booked_count} de ${session.capacity} ${placeWord}`;
    const suffixes: string[] = [];
    if (state === 'full') suffixes.push('lleno');
    else if (state === 'almost_full') suffixes.push('casi lleno');
    if (isPast) suffixes.push('pasada');

    return suffixes.length > 0
        ? `${session.title}, ${dayLabel} ${startTime}, ${occupancy}, ${suffixes.join(', ')}`
        : `${session.title}, ${dayLabel} ${startTime}, ${occupancy}`;
}

export const SessionBlock: React.FC<SessionBlockProps> = ({
    session,
    timezone,
    isSelected = false,
    isPast = false,
    compact = false,
    onSelect,
    style,
    className = '',
}) => {
    const state = getOccupancyState(session.booked_count, session.capacity, session.status);
    const styles = BLOCK_STYLES[state];
    const isCancelled = state === 'cancelled';

    const startTime = formatLocalTime(session.starts_at, timezone);
    const endTime = formatLocalTime(session.ends_at, timezone);
    const accessibleLabel = formatSessionAccessibleLabel(session, timezone, isPast);

    return (
        <button
            type="button"
            onClick={() => onSelect(session.id)}
            aria-label={accessibleLabel}
            aria-pressed={isSelected}
            style={style}
            className={`w-full h-full text-left flex flex-col justify-start gap-0.5 overflow-hidden rounded-md border border-l-[3px] px-2 py-1 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:z-20 ${styles.surface} ${
                isPast ? 'opacity-60 hover:opacity-85' : ''
            } ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1 shadow-sm z-20' : ''} ${className}`}
        >
            <div className="flex items-start justify-between gap-1 min-w-0 w-full">
                <span
                    className={`text-xs font-semibold leading-tight truncate ${
                        isCancelled ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                >
                    {session.title}
                </span>
                <span
                    aria-hidden="true"
                    className={`shrink-0 text-[11px] font-semibold leading-tight tabular-nums ${styles.count}`}
                >
                    {isCancelled ? 'Cancelada' : `${session.booked_count}/${session.capacity}`}
                </span>
            </div>

            {compact ? (
                <p aria-hidden="true" className="text-[11px] leading-tight text-slate-600 truncate tabular-nums">
                    {startTime} · {session.coach.full_name}
                </p>
            ) : (
                <>
                    <p aria-hidden="true" className="text-[11px] leading-tight text-slate-600 truncate tabular-nums">
                        {startTime}–{endTime}
                    </p>
                    <p aria-hidden="true" className="text-[11px] leading-tight text-slate-500 truncate">
                        {session.coach.full_name}
                    </p>
                </>
            )}
        </button>
    );
};
