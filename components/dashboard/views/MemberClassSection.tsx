import React, { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useBookSession, useCancelBooking, useClassSessions, type CreateBookingVars } from '../../../hooks/useAgenda';
import { useApi } from '../../../hooks/useApi';
import { addLocalDays, formatLocalTime, localDateOf } from '../../../lib/agenda/time';
import type { ClassSessionSummary } from '../../../lib/agenda/types';
import type { ClassAccessMode } from '../../../types';

interface UpcomingBooking {
    id: string;
    session: {
        id: string;
        title: string;
        starts_at: string;
        room: { name: string };
        coach: { full_name: string };
    };
}

interface MemberClassSummary {
    class_access: ClassAccessMode;
    class_credit_limit: number | null;
    credits_used: number;
    credits_remaining: number | null;
    membership_valid_until: string | null;
    booked_session_ids?: string[];
    upcoming: UpcomingBooking[];
}

const HOUR = 60 * 60 * 1000;
const WALK_IN_GRACE = 2 * HOUR;

const formatClassDate = (value: string, timeZone: string, withTime = false) =>
    new Intl.DateTimeFormat('es-MX', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: withTime ? 'short' : undefined,
    }).format(new Date(value));

const formatDay = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const normalizeSearch = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

function UpcomingBookingRow({ branchId, booking: { id, session }, timezone, onCancelled }: {
    branchId: string; booking: UpcomingBooking; timezone: string; onCancelled: (title: string) => void;
}) {
    const cancel = useCancelBooking(branchId, session.id);
    async function cancelBooking() {
        try {
            await cancel.mutateAsync({ bookingId: id });
            onCancelled(session.title);
        } catch {
            // The mutation exposes the error next to this row.
        }
    }
    return (
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 py-2 text-sm">
            <div>
                <p className="break-words font-medium text-slate-900">{session.title}</p>
                <time dateTime={session.starts_at} className="text-slate-600">{formatClassDate(session.starts_at, timezone, true)}</time>
                <p className="break-words text-xs text-slate-600">{session.room.name} · {session.coach.full_name}</p>
            </div>
            <Button
                type="button" variant="outline" className="!px-2.5 !py-1.5 !text-xs" isLoading={cancel.isPending}
                aria-label={`Cancelar reserva de ${session.title}`}
                onClick={cancelBooking}
            >
                Cancelar
            </Button>
            {cancel.error && <p role="alert" className="col-span-2 text-xs text-slate-700">{cancel.error.message}</p>}
        </li>
    );
}

function ClassPicker({ branchId, timezone, unavailable, booked, busy, onBook }: {
    branchId: string; timezone: string; unavailable: string | null; booked: ReadonlySet<string>;
    busy: boolean; onBook: (session: ClassSessionSummary, checkIn: boolean) => void;
}) {
    const [term, setTerm] = useState('');
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    const today = localDateOf(new Date(now).toISOString(), timezone);
    // A session can start before midnight and still be eligible for walk-in today (12 h class + 2 h grace).
    const from = localDateOf(new Date(now - 12 * HOUR - WALK_IN_GRACE).toISOString(), timezone);
    const sessions = useClassSessions(branchId, from, addLocalDays(today, 8));
    const search = normalizeSearch(term);
    const byDay = new Map<string, ClassSessionSummary[]>();
    for (const session of sessions.isPlaceholderData ? [] : sessions.data ?? []) {
        if (Date.parse(session.ends_at) + WALK_IN_GRACE < now) continue;
        if (!normalizeSearch(`${session.title} ${session.coach.full_name}`).includes(search)) continue;
        const date = localDateOf(session.starts_at, timezone);
        const existing = byDay.get(date);
        if (existing) existing.push(session);
        else byDay.set(date, [session]);
    }

    return (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <input
                type="search" aria-label="Filtrar clases por nombre o coach" placeholder="Buscar clase o coach"
                value={term} onChange={(event) => setTerm(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
            />
            {sessions.isError ? (
                <p role="alert" className="text-sm text-slate-700">
                    {sessions.error.message}{' '}
                    <button type="button" className="underline" onClick={() => { void sessions.refetch(); }}>Reintentar</button>
                </p>
            ) : sessions.isLoading || sessions.isPlaceholderData ? (
                <p role="status" className="text-sm text-slate-600">Cargando horarios...</p>
            ) : byDay.size === 0 ? (
                <p className="text-sm text-slate-600">{search ? 'No hay clases que coincidan con tu búsqueda.' : 'No hay clases en los próximos días.'}</p>
            ) : (
                <div className="max-h-80 space-y-4 overflow-y-auto overscroll-contain pr-1">
                    {[...byDay].map(([date, rows]) => (
                        <div key={date}>
                            <h6 className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-700 first-letter:uppercase">
                                {date === today ? 'Hoy, ' : ''}{formatDay.format(new Date(`${date}T12:00:00Z`))}
                            </h6>
                            <ul className="divide-y divide-slate-100">
                                {rows.map((session) => {
                                    const hour = formatLocalTime(session.starts_at, timezone);
                                    const checkIn = Date.parse(session.starts_at) <= now;
                                    const reason = session.status === 'cancelled' ? 'Cancelada'
                                        : booked.has(session.id) ? 'Ya reservada'
                                        : session.booked_count >= session.capacity ? 'Llena'
                                        : !checkIn && now < Date.parse(session.booking_opens_at) ? 'Aún no abre'
                                        : !checkIn && now >= Date.parse(session.booking_closes_at) ? 'Reservas cerradas'
                                        : unavailable;
                                    const action = checkIn ? 'Registrar asistencia' : 'Reservar';
                                    return (
                                        <li key={session.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 py-2.5 text-sm">
                                            <time dateTime={session.starts_at} className="font-medium tabular-nums text-slate-700">{hour}</time>
                                            <div className="min-w-0">
                                                <p className="break-words font-medium text-slate-900">
                                                    {session.title}{session.level && <span className="text-xs text-slate-600"> · {session.level}</span>}
                                                </p>
                                                <p className="break-words text-xs text-slate-600">{session.room.name} · {session.coach.full_name}</p>
                                            </div>
                                            <div className="col-start-2 flex flex-wrap items-center justify-between gap-1.5">
                                                <span className="text-xs tabular-nums text-slate-600">Cupo {session.booked_count}/{session.capacity}</span>
                                                <Button
                                                    type="button" variant="outline" className="!px-2.5 !py-1 !text-xs"
                                                    disabled={busy || Boolean(reason)} aria-label={`${action} en ${session.title}, ${hour}${reason ? `: ${reason}` : ''}`}
                                                    onClick={() => onBook(session, checkIn)}
                                                >
                                                    {reason ?? action}
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function MemberClassSection({ branchId, memberId, timezone }: { branchId: string; memberId: string; timezone: string }) {
    const { apiCall } = useApi();
    const summary = useQuery({
        queryKey: ['class-member-summary', branchId, memberId],
        queryFn: ({ signal }) => apiCall<MemberClassSummary>(`/api/v1/branches/${branchId}/classes/members/${memberId}/summary`, { signal }),
    });
    const book = useBookSession(branchId);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [attendedIds, setAttendedIds] = useState<string[]>([]);
    const pending = useRef(new Map<string, CreateBookingVars>());
    const pickerId = useId();
    const unavailable = summary.isError ? 'No se pudo verificar el acceso'
        : summary.data?.class_access === 'none' ? 'Su plan no incluye clases'
        : summary.data?.class_access === 'credits' && summary.data.credits_remaining === 0 ? 'Sin créditos'
        : null;

    function handleBook(session: ClassSessionSummary, checkIn: boolean) {
        if (book.isPending) return;
        const vars = pending.current.get(session.id) ?? { memberId, bookingId: crypto.randomUUID(), checkIn };
        pending.current.set(session.id, vars);
        setNotice('');
        book.mutate({ ...vars, sessionId: session.id }, {
            onSuccess: (booking) => {
                pending.current.delete(session.id);
                if (booking.status === 'attended') setAttendedIds(ids => [...ids, session.id]);
                const date = localDateOf(session.starts_at, timezone);
                const when = `${formatDay.format(new Date(`${date}T12:00:00Z`))} ${formatLocalTime(session.starts_at, timezone)}`;
                setNotice(booking.status === 'cancelled' ? `La reserva de ${session.title} ya está cancelada.`
                    : `${booking.status === 'attended' ? 'Asistencia registrada' : 'Reservado'} en ${session.title}, ${when}.`);
            },
            onError: (error) => { if (error.code !== 'network') pending.current.delete(session.id); },
        });
    }

    const data = summary.data;
    const bookedIds = data?.booked_session_ids ?? data?.upcoming.map(({ session }) => session.id) ?? [];
    const booked = new Set([...bookedIds, ...attendedIds]);

    return (
        <section aria-label="Clases" className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <CalendarDays size={18} className="text-slate-500" aria-hidden="true" /> Clases
            </h4>
            {summary.isLoading && <p role="status" className="text-sm text-slate-600">Cargando clases...</p>}
            {summary.isError && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-slate-700">No se pudo cargar el resumen de clases.</p>
                    <Button type="button" variant="outline" onClick={() => { void summary.refetch(); }}>Reintentar</Button>
                </div>
            )}
            {data && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs text-slate-600">Acceso vigente</p>
                            <p className="text-sm font-medium text-slate-900">
                                {data.class_access === 'unlimited' ? 'Clases ilimitadas'
                                    : data.class_access === 'credits' ? 'Paquete de clases' : 'Sin acceso a clases'}
                            </p>
                            {data.membership_valid_until && (
                                <p className="mt-1 text-xs text-slate-600">Vence el {formatClassDate(data.membership_valid_until, timezone)}</p>
                            )}
                        </div>
                        <Button
                            type="button" className="!px-3 !py-2" aria-expanded={pickerOpen} aria-controls={pickerId}
                            disabled={!pickerOpen && Boolean(unavailable)} onClick={() => setPickerOpen(open => !open)}
                        >
                            {pickerOpen ? 'Ocultar clases' : 'Reservar clase'}
                        </Button>
                    </div>
                    {data.class_access === 'credits' && (
                        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <div>
                                <dt className="text-xs text-slate-600">Créditos usados</dt>
                                <dd className="text-sm font-semibold tabular-nums text-slate-900">{data.credits_used} de {data.class_credit_limit ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-slate-600">Créditos restantes</dt>
                                <dd className="text-sm font-semibold tabular-nums text-slate-900">{data.credits_remaining ?? '—'}</dd>
                            </div>
                        </dl>
                    )}
                    {unavailable && <p className="text-sm text-slate-700">{unavailable}.</p>}
                    <div id={pickerId} hidden={!pickerOpen}>
                        {pickerOpen && <ClassPicker branchId={branchId} timezone={timezone} unavailable={unavailable} booked={booked} busy={book.isPending} onBook={handleBook} />}
                    </div>
                    {notice && <p role="status" className="text-sm font-medium text-slate-700">{notice}</p>}
                    {book.error && <p role="alert" className="text-sm text-slate-700">{book.error.message}</p>}
                    <div>
                        <h5 className="text-sm font-medium text-slate-900">Próximas reservas</h5>
                        {data.upcoming.length === 0 ? (
                            <p className="mt-1 text-sm text-slate-600">Sin próximas reservas.</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-slate-200">
                                {data.upcoming.map(booking => (
                                    <React.Fragment key={booking.id}>
                                        <UpcomingBookingRow
                                            booking={booking} branchId={branchId} timezone={timezone}
                                            onCancelled={title => setNotice(`Reserva cancelada en ${title}.`)}
                                        />
                                    </React.Fragment>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
