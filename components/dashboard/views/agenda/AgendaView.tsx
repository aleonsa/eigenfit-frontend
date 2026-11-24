import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { WeekGrid } from './WeekGrid';
import { DayList } from './DayList';
import { SessionDrawer } from './SessionDrawer';
import { TemplateModal, type ClassPreset } from './TemplateModal';
import { AgendaSettingsDrawer } from './AgendaSettingsDrawer';
import { useClassSessions, useCoaches, useRooms } from '../../../../hooks/useAgenda';
import { addLocalDays, formatLocalTime, localDateOf, startOfLocalWeek } from '../../../../lib/agenda/time';
import type { ClassSessionSummary, LocalDate, SessionFilters } from '../../../../lib/agenda/types';

interface AgendaViewProps {
    branchId: string;
    userRole: string;
    /** Zona IANA de la sucursal. */
    timezone: string;
}

function weekLabel(weekStart: LocalDate): string {
    const start = new Date(`${weekStart}T12:00:00Z`);
    const end = new Date(`${addLocalDays(weekStart, 6)}T12:00:00Z`);
    const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const year = new Intl.DateTimeFormat('es-MX', { year: 'numeric', timeZone: 'UTC' }).format(end);
    return `${fmt.format(start)} – ${fmt.format(end)} ${year}`;
}

function dayChipLabel(date: LocalDate): { weekday: string; day: string } {
    const d = new Date(`${date}T12:00:00Z`);
    return {
        weekday: new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', ''),
        day: new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone: 'UTC' }).format(d),
    };
}

const selectClass =
    'px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:border-blue-600';

export const AgendaView: React.FC<AgendaViewProps> = ({ branchId, userRole, timezone: TIMEZONE }) => {
    const today = localDateOf(new Date().toISOString(), TIMEZONE);
    const [weekStart, setWeekStart] = useState<LocalDate>(() => startOfLocalWeek(new Date(), TIMEZONE));
    const [selectedDay, setSelectedDay] = useState<LocalDate>(today);
    const [filters, setFilters] = useState<SessionFilters>({});
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [templateKey, setTemplateKey] = useState(0);
    const [preset, setPreset] = useState<ClassPreset | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const weekEnd = addLocalDays(weekStart, 7);
    const sessions = useClassSessions(branchId, weekStart, weekEnd, filters);
    const rooms = useRooms(branchId);
    const coaches = useCoaches(branchId);

    const canManage = userRole === 'owner' || userRole === 'admin';
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addLocalDays(weekStart, i)), [weekStart]);
    const daySessions = useMemo(
        () => (sessions.data ?? []).filter((s) => localDateOf(s.starts_at, TIMEZONE) === selectedDay),
        [sessions.data, selectedDay],
    );
    // El drawer lee la sesión de la lista viva para reflejar el cupo actualizado tras cada mutación.
    // Mientras se muestran datos de otro rango (placeholder), no se abre ni opera ninguna sesión.
    const selectedSession = sessions.isPlaceholderData
        ? null
        : (sessions.data ?? []).find((s) => s.id === selectedSessionId) ?? null;

    const openNewClass = (p: ClassPreset | null) => {
        setPreset(p);
        setTemplateKey((k) => k + 1);
        setTemplateOpen(true);
    };

    const replaceSession = (s: ClassSessionSummary) => {
        setSelectedSessionId(null);
        openNewClass({
            mode: 'once',
            title: s.title,
            level: s.level,
            date: localDateOf(s.starts_at, TIMEZONE),
            start: formatLocalTime(s.starts_at, TIMEZONE),
            duration: Math.round((new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60_000),
            capacity: s.capacity,
            roomId: s.room.id,
            coachId: s.coach.id,
        });
    };

    const goToWeek = (start: LocalDate) => {
        // La sesión abierta pertenece al rango anterior: no debe sobrevivir al cambio.
        setSelectedSessionId(null);
        setWeekStart(start);
        setSelectedDay(start <= today && today < addLocalDays(start, 7) ? today : start);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
                    <p className="text-sm text-slate-500 mt-1">Clases de la semana y reservas por sesión.</p>
                </div>
                {canManage && (
                    <div className="flex gap-2 self-start md:self-auto">
                        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                            <Settings2 size={16} className="mr-1.5" /> Espacios y series
                        </Button>
                        <Button onClick={() => openNewClass(null)}>
                            <Plus size={16} className="mr-1.5" /> Nueva clase
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-md border border-slate-200 bg-white">
                    <button
                        type="button"
                        onClick={() => goToWeek(addLocalDays(weekStart, -7))}
                        aria-label="Semana anterior"
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-l-md"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => goToWeek(startOfLocalWeek(new Date(), TIMEZONE))}
                        className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 border-x border-slate-200"
                    >
                        Hoy
                    </button>
                    <button
                        type="button"
                        onClick={() => goToWeek(addLocalDays(weekStart, 7))}
                        aria-label="Semana siguiente"
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-md"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <h2 className="text-sm font-medium text-slate-900 px-1 capitalize" aria-live="polite">
                    {weekLabel(weekStart)}
                </h2>
                {sessions.isFetching && !sessions.isLoading && (
                    <RefreshCw size={14} className="animate-spin text-slate-400" aria-label="Actualizando" />
                )}
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                    <select
                        aria-label="Filtrar por coach"
                        className={`${selectClass} flex-1 sm:flex-none`}
                        value={filters.coach_member_id ?? ''}
                        onChange={(e) => {
                            setSelectedSessionId(null);
                            setFilters((f) => ({ ...f, coach_member_id: e.target.value || undefined }));
                        }}
                    >
                        <option value="">Todos los coaches</option>
                        {(coaches.data ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.full_name}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Filtrar por sala"
                        className={`${selectClass} flex-1 sm:flex-none`}
                        value={filters.room_id ?? ''}
                        onChange={(e) => {
                            setSelectedSessionId(null);
                            setFilters((f) => ({ ...f, room_id: e.target.value || undefined }));
                        }}
                    >
                        <option value="">Todas las salas</option>
                        {(rooms.data ?? []).map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {sessions.isError ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-6 text-center text-sm text-rose-700">
                    No se pudo cargar la agenda.{' '}
                    <button className="underline" onClick={() => sessions.refetch()}>
                        Reintentar
                    </button>
                </div>
            ) : sessions.isLoading ? (
                <div className="h-[520px] rounded-lg border border-slate-100 bg-white animate-pulse" aria-busy aria-label="Cargando agenda" />
            ) : (
                <>
                    {/* Escritorio: semana completa */}
                    <div className="hidden md:block bg-white border border-slate-100 rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <WeekGrid
                            weekStart={weekStart}
                            timezone={TIMEZONE}
                            sessions={sessions.data ?? []}
                            selectedSessionId={selectedSessionId ?? undefined}
                            onSelectSession={setSelectedSessionId}
                        />
                    </div>

                    {/* Móvil: selector de día + lista */}
                    <div className="md:hidden space-y-3">
                        <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Día de la semana">
                            {weekDays.map((d) => {
                                const { weekday, day } = dayChipLabel(d);
                                const active = d === selectedDay;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setSelectedDay(d)}
                                        className={`flex flex-col items-center rounded-md py-1.5 text-xs border ${
                                            active
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : d === today
                                                  ? 'bg-white text-blue-700 border-blue-200'
                                                  : 'bg-white text-slate-600 border-slate-100'
                                        }`}
                                    >
                                        <span className="capitalize">{weekday}</span>
                                        <span className="text-sm font-semibold">{day}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <DayList
                            date={selectedDay}
                            timezone={TIMEZONE}
                            sessions={daySessions}
                            selectedSessionId={selectedSessionId ?? undefined}
                            onSelectSession={setSelectedSessionId}
                        />
                    </div>
                </>
            )}

            <SessionDrawer
                key={selectedSessionId ?? 'none'}
                branchId={branchId}
                timezone={TIMEZONE}
                session={selectedSession}
                canManage={canManage}
                onReplace={replaceSession}
                onClose={() => setSelectedSessionId(null)}
            />

            {canManage && (
                <>
                    <TemplateModal
                        key={templateKey}
                        branchId={branchId}
                        isOpen={templateOpen}
                        defaultStartsOn={weekStart < today ? today : weekStart}
                        preset={preset}
                        onClose={() => setTemplateOpen(false)}
                        onOpenSettings={() => setSettingsOpen(true)}
                    />
                    <AgendaSettingsDrawer
                        branchId={branchId}
                        isOpen={settingsOpen}
                        today={today}
                        onClose={() => setSettingsOpen(false)}
                    />
                </>
            )}
        </div>
    );
};
