import React, { useEffect, useState } from 'react';
import { CalendarX, Check, Pencil, X } from 'lucide-react';
import { Drawer } from '../../../ui/Drawer';
import { Button } from '../../../ui/Button';
import { AddAttendeePanel, CHECKIN_GRACE_MS, CHECKIN_OPENS_BEFORE_MS, type AddMode } from './AddAttendeePanel';
import { SessionEditForm } from './SessionEditForm';
import { useCancelBooking, useCancelSession, useCheckInBooking, useSessionBookings } from '../../../../hooks/useAgenda';
import { formatLocalTime } from '../../../../lib/agenda/time';
import { AgendaError, type ClassBooking, type ClassSessionSummary } from '../../../../lib/agenda/types';

interface SessionDrawerProps {
    branchId: string;
    timezone: string;
    session: ClassSessionSummary | null;
    canManage: boolean;
    /** Abre "Nueva clase" precargada con el horario de esta sesión (para reponer una cancelada). */
    onReplace: (session: ClassSessionSummary) => void;
    onClose: () => void;
}

const STATUS_LABEL: Record<ClassBooking['status'], string> = {
    confirmed: 'Reservado',
    attended: 'Asistió',
    cancelled: 'Cancelado',
    no_show: 'No asistió',
};

const STATUS_STYLE: Record<ClassBooking['status'], string> = {
    confirmed: 'bg-slate-100 text-slate-700',
    attended: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-slate-50 text-slate-400 line-through',
    no_show: 'bg-rose-50 text-rose-700',
};

function errorMessage(err: unknown): string | null {
    if (!err) return null;
    if (err instanceof AgendaError) return err.message;
    return 'Ocurrió un error. Intenta de nuevo.';
}

function formatLongDate(iso: string, timeZone: string): string {
    return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(
        new Date(iso),
    );
}

/** Reloj que se actualiza periódicamente para que las ventanas (reserva, cancelación) cambien sin interacción. */
function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);
    return now;
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({ branchId, timezone, session, canManage, onReplace, onClose }) => {
    const sessionId = session?.id ?? '';
    const bookings = useSessionBookings(branchId, sessionId);
    const cancelBooking = useCancelBooking(branchId, sessionId);
    const checkIn = useCheckInBooking(branchId, sessionId);
    const cancelSession = useCancelSession(branchId, sessionId);
    const now = useNow(30_000);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [editing, setEditing] = useState(false);

    if (!session) return null;

    const t = (iso: string) => new Date(iso).getTime();
    const isCancelled = session.status === 'cancelled';
    const hasStarted = t(session.starts_at) <= now;
    const hasEnded = t(session.ends_at) <= now;
    const checkinStarted = now >= t(session.starts_at) - CHECKIN_OPENS_BEFORE_MS;
    const checkinOpen = checkinStarted && now < t(session.ends_at) + CHECKIN_GRACE_MS;
    const checkinOver = now >= t(session.ends_at) + CHECKIN_GRACE_MS;
    const isFull = session.booked_count >= session.capacity;
    // Pasado el límite de cancelación solo admin/owner puede cancelar (override), y nunca después de terminar.
    const cancelWindowOpen = t(session.cancel_until) > now;
    const canCancelBooking = !hasEnded && (cancelWindowOpen || canManage);
    const fmtInstant = (iso: string) => `${formatLongDate(iso, timezone)} a las ${formatLocalTime(iso, timezone)}`;

    const all = bookings.data ?? [];
    const active = all.filter((b) => b.status !== 'cancelled');
    const cancelled = all.filter((b) => b.status === 'cancelled');
    const bookedIds = new Set(active.filter((b) => b.status === 'confirmed').map((b) => b.member.id));
    const attendedIds = new Set(active.filter((b) => b.status !== 'confirmed').map((b) => b.member.id));
    const attendedCount = active.filter((b) => b.status === 'attended').length;

    // Qué se puede hacer ahora para meter a alguien, y si no, por qué (nunca ocultarlo sin explicar).
    let addMode: AddMode;
    if (isCancelled) addMode = { kind: 'blocked', reason: 'La clase está cancelada; no se pueden agregar personas.' };
    else if (checkinOver) addMode = { kind: 'blocked', reason: 'La clase terminó hace más de 2 horas; ya no se pueden registrar asistentes.' };
    else if (isFull && !hasStarted) addMode = { kind: 'blocked', reason: `La clase está llena (${session.capacity} lugares). Puedes subir el cupo con “Editar”.` };
    else if (checkinOpen && (hasStarted || t(session.booking_closes_at) <= now)) addMode = { kind: 'walk_in' };
    else if (t(session.booking_closes_at) <= now)
        addMode = {
            kind: 'blocked',
            reason: `Las reservas cerraron. Desde las ${formatLocalTime(
                new Date(t(session.starts_at) - CHECKIN_OPENS_BEFORE_MS).toISOString(),
                timezone,
            )} podrás registrar asistencia aquí mismo.`,
        };
    else if (now < t(session.booking_opens_at))
        addMode = { kind: 'blocked', reason: `Las reservas abren el ${fmtInstant(session.booking_opens_at)}.` };
    else addMode = { kind: 'book' };

    const phase = isCancelled
        ? { text: 'Cancelada', cls: 'bg-slate-100 text-slate-600' }
        : hasEnded
          ? { text: 'Terminada', cls: 'bg-slate-100 text-slate-600' }
          : hasStarted
            ? { text: 'En curso', cls: 'bg-blue-50 text-blue-700' }
            : { text: 'Próxima', cls: 'bg-emerald-50 text-emerald-700' };
    const pct = session.capacity > 0 ? Math.min(100, Math.round((session.booked_count / session.capacity) * 100)) : 0;

    const subtitle = `${formatLongDate(session.starts_at, timezone)} · ${formatLocalTime(session.starts_at, timezone)}–${formatLocalTime(
        session.ends_at,
        timezone,
    )} · ${session.room.name} · ${session.coach.full_name}`;

    const rosterError = errorMessage(cancelBooking.error) || errorMessage(checkIn.error) || errorMessage(cancelSession.error);

    return (
        <Drawer isOpen onClose={onClose} title={session.title} subtitle={subtitle}>
            <div className="space-y-6">
                {/* Estado: fase, ocupación y acciones de admin */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phase.cls}`}>{phase.text}</span>
                            {session.level && <span className="text-xs text-slate-500">{session.level}</span>}
                        </div>
                        {canManage && !isCancelled && !hasStarted && !confirmingCancel && !editing && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-50"
                                >
                                    <Pencil size={14} aria-hidden /> Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingCancel(true)}
                                    className="text-xs font-medium text-slate-500 hover:text-rose-700 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-rose-50"
                                >
                                    <CalendarX size={14} aria-hidden /> Cancelar clase
                                </button>
                            </div>
                        )}
                    </div>
                    {!isCancelled && (
                        <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>
                                    <strong className="text-slate-900">{session.booked_count}</strong> de {session.capacity} lugares
                                </span>
                                {hasStarted && <span>{attendedCount} {attendedCount === 1 ? 'asistió' : 'asistieron'}</span>}
                            </div>
                            <div
                                className="h-1.5 rounded-full bg-slate-100 overflow-hidden"
                                role="progressbar"
                                aria-label="Ocupación"
                                aria-valuemin={0}
                                aria-valuemax={session.capacity}
                                aria-valuenow={session.booked_count}
                            >
                                <div
                                    className={`h-full rounded-full ${isFull ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {isCancelled && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <p>Clase cancelada{session.cancel_reason ? `: ${session.cancel_reason}` : ''}.</p>
                        {canManage && !hasStarted && (
                            <p className="mt-2 text-xs text-slate-500">
                                El horario y el espacio quedaron libres.{' '}
                                <button type="button" className="underline text-slate-700" onClick={() => onReplace(session)}>
                                    Crear otra clase en este horario
                                </button>
                            </p>
                        )}
                    </div>
                )}

                {editing && <SessionEditForm branchId={branchId} session={session} onDone={() => setEditing(false)} />}

                {confirmingCancel && (
                    <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4 space-y-3">
                        <p className="text-sm text-slate-700">
                            Se cancelarán <strong>{session.booked_count}</strong> reservas. Esta acción no se puede deshacer.
                        </p>
                        <label className="block text-xs font-medium text-slate-700" htmlFor="cancel-reason">
                            Motivo
                        </label>
                        <input
                            id="cancel-reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Ej. coach enfermo"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-600"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                                Volver
                            </Button>
                            <Button
                                variant="danger"
                                isLoading={cancelSession.isPending}
                                disabled={!cancelReason.trim()}
                                onClick={() =>
                                    cancelSession.mutate(cancelReason.trim(), {
                                        onSuccess: () => setConfirmingCancel(false),
                                    })
                                }
                            >
                                Cancelar clase
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lo principal: meter a alguien a la clase */}
                {!isCancelled && (
                    <AddAttendeePanel
                        branchId={branchId}
                        session={session}
                        mode={addMode}
                        bookedIds={bookedIds}
                        attendedIds={attendedIds}
                    />
                )}

                <section aria-labelledby="roster-title" className="space-y-2">
                    <h3 id="roster-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Inscritos ({active.length})
                    </h3>
                    {rosterError && (
                        <div role="alert" className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                            {rosterError}
                        </div>
                    )}
                    {!isCancelled && !hasEnded && !cancelWindowOpen && !canManage && active.length > 0 && (
                        <p className="text-xs text-slate-400">
                            El plazo para cancelar reservas terminó; solo un administrador puede cancelarlas.
                        </p>
                    )}
                    {bookings.isLoading && (
                        <div className="space-y-2" aria-busy>
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-11 rounded-md bg-slate-50 animate-pulse" />
                            ))}
                        </div>
                    )}
                    {bookings.isError && (
                        <div className="text-sm text-rose-700">
                            No se pudo cargar la lista.{' '}
                            <button type="button" className="underline" onClick={() => bookings.refetch()}>
                                Reintentar
                            </button>
                        </div>
                    )}
                    {bookings.isSuccess && active.length === 0 && (
                        <p className="text-sm text-slate-400 py-3">
                            {isCancelled ? 'No había reservas.' : 'Todavía no hay nadie. Usa el buscador de arriba para agregar.'}
                        </p>
                    )}
                    <ul className="divide-y divide-slate-50">
                        {active.map((b) => (
                            <li key={b.id} className="flex items-center justify-between py-2.5 gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-900 truncate">{b.member.full_name}</p>
                                    <p className="text-xs text-slate-400">#{b.member.code}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {b.status === 'confirmed' && !isCancelled && checkinOpen ? (
                                        <button
                                            type="button"
                                            onClick={() => checkIn.mutate(b.id)}
                                            disabled={checkIn.isPending}
                                            aria-label={`Marcar asistencia de ${b.member.full_name}`}
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                                        >
                                            <Check size={14} aria-hidden /> Marcar asistencia
                                        </button>
                                    ) : (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status]}`}>
                                            {STATUS_LABEL[b.status]}
                                        </span>
                                    )}
                                    {b.status === 'confirmed' && !isCancelled && canCancelBooking && (
                                        <button
                                            type="button"
                                            onClick={() => cancelBooking.mutate({ bookingId: b.id, overrideWindow: !cancelWindowOpen })}
                                            disabled={cancelBooking.isPending}
                                            aria-label={`Cancelar reserva de ${b.member.full_name}`}
                                            title={cancelWindowOpen ? 'Cancelar reserva' : 'Cancelar fuera de tiempo (admin)'}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <X size={16} aria-hidden />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {cancelled.length > 0 && (
                        <details className="pt-2">
                            <summary className="text-xs text-slate-400 cursor-pointer select-none">
                                {cancelled.length} cancelada{cancelled.length === 1 ? '' : 's'}
                            </summary>
                            <ul className="mt-2 space-y-1">
                                {cancelled.map((b) => (
                                    <li key={b.id} className="text-xs text-slate-400 line-through">
                                        {b.member.full_name}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </section>
            </div>
        </Drawer>
    );
};
