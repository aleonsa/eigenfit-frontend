import React from 'react';
import type { SessionStatus } from '../../../../lib/agenda/types';

export type OccupancyState = 'available' | 'almost_full' | 'full' | 'cancelled';

export interface OccupancyBadgeProps {
    booked: number;
    capacity: number;
    status: SessionStatus;
    className?: string;
}

export function getOccupancyState(booked: number, capacity: number, status: SessionStatus): OccupancyState {
    if (status === 'cancelled') return 'cancelled';
    if (capacity <= 0 || booked >= capacity) return 'full';
    if (booked / capacity >= 0.8) return 'almost_full';
    return 'available';
}

const BADGE_STYLES: Record<OccupancyState, { pill: string; dot: string }> = {
    available: {
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    almost_full: {
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
    },
    full: {
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
    },
    cancelled: {
        pill: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
    },
};

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({
    booked,
    capacity,
    status,
    className = '',
}) => {
    const state = getOccupancyState(booked, capacity, status);
    const styles = BADGE_STYLES[state];

    const label =
        state === 'cancelled'
            ? 'Cancelada'
            : state === 'full'
              ? `${booked}/${capacity} · Lleno`
              : state === 'almost_full'
                ? `${booked}/${capacity} · Casi lleno`
                : `${booked}/${capacity}`;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium tabular-nums whitespace-nowrap ${styles.pill} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />
            <span>{label}</span>
        </span>
    );
};
