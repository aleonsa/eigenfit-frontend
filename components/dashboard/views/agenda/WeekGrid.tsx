import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { addLocalDays, formatLocalTime, localDateOf } from '../../../../lib/agenda/time';
import type { ClassSessionSummary, LocalDate } from '../../../../lib/agenda/types';
import { SessionBlock } from './SessionBlock';

export interface WeekGridProps {
    weekStart: LocalDate;
    timezone: string;
    sessions: ClassSessionSummary[];
    selectedSessionId?: string;
    onSelectSession: (sessionId: string) => void;
    now?: Date;
}

interface PositionedSession {
    session: ClassSessionSummary;
    day: LocalDate;
    startMin: number;
    endMin: number;
    lane: number;
    laneCount: number;
}

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 32;
const MIN_BLOCK_HEIGHT_PX = 24;

function parseMinutes(hhmm: string): number {
    const [hours, minutes] = hhmm.split(':').map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function formatHourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

function formatDayHeader(date: LocalDate): { weekday: string; dayNumber: string; fullLabel: string } {
    const noonUtc = new Date(`${date}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' })
        .format(noonUtc)
        .replace('.', '');
    const dayNumber = new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone: 'UTC' }).format(noonUtc);
    const fullLabel = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(noonUtc);
    return { weekday, dayNumber, fullLabel };
}

function getSessionRange(session: ClassSessionSummary, timezone: string): { day: LocalDate; startMin: number; endMin: number } {
    const day = localDateOf(session.starts_at, timezone);
    const startMin = parseMinutes(formatLocalTime(session.starts_at, timezone));
    const endDay = localDateOf(session.ends_at, timezone);
    const durationMin = Math.max(
        15,
        Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60_000),
    );
    const rawEndMin = endDay === day ? parseMinutes(formatLocalTime(session.ends_at, timezone)) : startMin + durationMin;
    const endMin = rawEndMin > startMin ? Math.min(24 * 60, rawEndMin) : Math.min(24 * 60, startMin + durationMin);
    return { day, startMin, endMin };
}

function layoutDaySessions(items: Array<{ session: ClassSessionSummary; day: LocalDate; startMin: number; endMin: number }>): PositionedSession[] {
    if (items.length === 0) return [];

    const sorted = [...items].sort((a, b) =>
        a.startMin - b.startMin || b.endMin - a.endMin || a.session.id.localeCompare(b.session.id),
    );

    const clusters: Array<typeof sorted> = [];
    let currentCluster: typeof sorted = [];
    let clusterEnd = -1;

    for (const item of sorted) {
        if (currentCluster.length === 0 || item.startMin < clusterEnd) {
            currentCluster.push(item);
            clusterEnd = Math.max(clusterEnd, item.endMin);
        } else {
            clusters.push(currentCluster);
            currentCluster = [item];
            clusterEnd = item.endMin;
        }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const positioned: PositionedSession[] = [];
    for (const cluster of clusters) {
        const laneEnds: number[] = [];
        const assigned: Array<{ item: (typeof sorted)[number]; lane: number }> = [];

        for (const item of cluster) {
            let lane = laneEnds.findIndex((end) => end <= item.startMin);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(item.endMin);
            } else {
                laneEnds[lane] = item.endMin;
            }
            assigned.push({ item, lane });
        }

        const laneCount = laneEnds.length;
        for (const { item, lane } of assigned) {
            positioned.push({ ...item, lane, laneCount });
        }
    }

    return positioned;
}

export const WeekGrid: React.FC<WeekGridProps> = ({
    weekStart,
    timezone,
    sessions,
    selectedSessionId,
    onSelectSession,
    now,
}) => {
    const currentNow = now ?? new Date();
    const nowMs = currentNow.getTime();
    const todayKey = localDateOf(currentNow.toISOString(), timezone);
    const nowMinutes = parseMinutes(formatLocalTime(currentNow.toISOString(), timezone));

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addLocalDays(weekStart, i)),
        [weekStart],
    );

    const { sessionsByDay, startHour, endHour, totalWeekSessions } = useMemo(() => {
        const daySet = new Set(weekDays);
        const grouped = new Map<LocalDate, Array<{ session: ClassSessionSummary; day: LocalDate; startMin: number; endMin: number }>>();
        for (const day of weekDays) grouped.set(day, []);

        let minStart = DEFAULT_START_HOUR;
        let maxEnd = DEFAULT_END_HOUR;
        let count = 0;

        for (const session of sessions) {
            const range = getSessionRange(session, timezone);
            if (!daySet.has(range.day)) continue;
            grouped.get(range.day)!.push({ session, ...range });
            minStart = Math.min(minStart, Math.floor(range.startMin / 60));
            maxEnd = Math.max(maxEnd, Math.ceil(range.endMin / 60));
            count += 1;
        }

        const positionedByDay = new Map<LocalDate, PositionedSession[]>();
        for (const day of weekDays) {
            positionedByDay.set(day, layoutDaySessions(grouped.get(day)!));
        }

        return {
            sessionsByDay: positionedByDay,
            startHour: Math.max(0, minStart),
            endHour: Math.min(24, maxEnd),
            totalWeekSessions: count,
        };
    }, [sessions, timezone, weekDays]);

    const totalSlots = (endHour - startHour) * (60 / SLOT_MINUTES);
    const gridHeightPx = totalSlots * SLOT_HEIGHT_PX;
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    const showNowLine = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    const nowTopPx = ((nowMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_PX;

    return (
        <div role="region" aria-label="Agenda semanal de clases" className="overflow-x-auto bg-white">
            <div className="min-w-[760px]">
                {/* Day headers */}
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/70">
                    <div className="border-r border-slate-100" aria-hidden="true" />
                    {weekDays.map((day) => {
                        const { weekday, dayNumber, fullLabel } = formatDayHeader(day);
                        const isToday = day === todayKey;
                        return (
                            <div
                                key={day}
                                aria-current={isToday ? 'date' : undefined}
                                aria-label={isToday ? `${fullLabel}, hoy` : fullLabel}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs border-r border-slate-100 last:border-r-0 ${
                                    isToday ? 'bg-blue-50/50 text-blue-700 font-semibold' : 'text-slate-600 font-medium'
                                }`}
                            >
                                <span className="lowercase">{weekday}</span>
                                <span
                                    className={`inline-flex items-center justify-center tabular-nums ${
                                        isToday
                                            ? 'w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold'
                                            : 'text-slate-900 font-semibold'
                                    }`}
                                >
                                    {dayNumber}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {totalWeekSessions === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-20 px-6 text-center">
                        <CalendarDays size={28} className="text-slate-300" aria-hidden="true" />
                        <p className="text-sm font-medium text-slate-700">No hay clases programadas esta semana</p>
                        <p className="text-xs text-slate-400">
                            Cambia de semana o ajusta los filtros para consultar otros horarios.
                        </p>
                    </div>
                ) : (
                    <div
                        className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] relative"
                        style={{ height: `${gridHeightPx}px` }}
                    >
                        {/* Time axis */}
                        <div className="relative border-r border-slate-100 bg-white select-none" aria-hidden="true">
                            {Array.from({ length: endHour - startHour }, (_, idx) => {
                                const hour = startHour + idx;
                                const topPx = idx * 2 * SLOT_HEIGHT_PX;
                                return (
                                    <div
                                        key={hour}
                                        style={{ top: idx === 0 ? '2px' : `${topPx}px` }}
                                        className={`absolute inset-x-0 flex justify-end pr-2 ${
                                            idx === 0 ? '' : '-translate-y-1/2'
                                        }`}
                                    >
                                        <span className="text-[11px] text-slate-400 tabular-nums">
                                            {formatHourLabel(hour)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Day columns */}
                        {weekDays.map((day) => {
                            const isToday = day === todayKey;
                            const dayItems = sessionsByDay.get(day) ?? [];

                            return (
                                <div
                                    key={day}
                                    className={`relative border-r border-slate-100 last:border-r-0 ${
                                        isToday ? 'bg-blue-50/20' : 'bg-white'
                                    }`}
                                >
                                    {/* 30-min grid lines */}
                                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                                        {Array.from({ length: totalSlots }, (_, slotIdx) => {
                                            if (slotIdx === 0) return null;
                                            const isWholeHour = slotIdx % 2 === 0;
                                            return (
                                                <div
                                                    key={slotIdx}
                                                    style={{ top: `${slotIdx * SLOT_HEIGHT_PX}px` }}
                                                    className={`absolute inset-x-0 border-t ${
                                                        isWholeHour
                                                            ? 'border-slate-200/80'
                                                            : 'border-slate-100 border-dashed'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Session blocks */}
                                    {dayItems.map((item) => {
                                        const topPx = ((item.startMin - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
                                        const rawHeightPx = ((item.endMin - item.startMin) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
                                        const heightPx = Math.max(MIN_BLOCK_HEIGHT_PX, rawHeightPx - 2);
                                        const leftPct = (item.lane / item.laneCount) * 100;
                                        const widthPct = (1 / item.laneCount) * 100;
                                        const isPast = new Date(item.session.ends_at).getTime() <= nowMs;
                                        const compact = item.endMin - item.startMin < 60;

                                        return (
                                            <div
                                                key={item.session.id}
                                                style={{
                                                    top: `${topPx + 1}px`,
                                                    height: `${heightPx}px`,
                                                    left: `${leftPct}%`,
                                                    width: `${widthPct}%`,
                                                }}
                                                className="absolute px-0.5"
                                            >
                                                <SessionBlock
                                                    session={item.session}
                                                    timezone={timezone}
                                                    isSelected={item.session.id === selectedSessionId}
                                                    isPast={isPast}
                                                    compact={compact}
                                                    onSelect={onSelectSession}
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Current time line */}
                                    {isToday && showNowLine && (
                                        <div
                                            aria-hidden="true"
                                            style={{ top: `${nowTopPx}px` }}
                                            className="absolute inset-x-0 z-10 pointer-events-none flex items-center -translate-y-1/2"
                                        >
                                            <span className="-ml-1 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                            <span className="h-[2px] flex-1 bg-blue-600" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
