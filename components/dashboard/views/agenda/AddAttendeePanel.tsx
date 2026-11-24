import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Search, UserPlus } from 'lucide-react';
import { useCreateBooking, useEligibility, useMemberSearch } from '../../../../hooks/useAgenda';
import { AgendaError, type BookableMember, type ClassSessionSummary, type MemberEligibility } from '../../../../lib/agenda/types';

/** Igual que el backend: el check-in (y el walk-in) abre 30 min antes del inicio… */
export const CHECKIN_OPENS_BEFORE_MS = 30 * 60 * 1000;
/** …y sigue abierto hasta 2 h después de terminar. */
export const CHECKIN_GRACE_MS = 2 * 60 * 60 * 1000;

export type AddMode =
    | { kind: 'book' } // antes de empezar, reservas abiertas
    | { kind: 'walk_in' } // en curso o recién terminada: entra directo como "asistió"
    | { kind: 'blocked'; reason: string };

interface AddAttendeePanelProps {
    branchId: string;
    session: ClassSessionSummary;
    mode: AddMode;
    /** Socios con reserva confirmada (aún sin asistencia). */
    bookedIds: Set<string>;
    /** Socios que ya asistieron o no se presentaron. */
    attendedIds: Set<string>;
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

function eligibilityChip(e: MemberEligibility | undefined): { text: string; tone: 'ok' | 'warn' } | null {
    if (!e) return null;
    if (!e.eligible) return { text: e.message ?? 'No puede reservar', tone: 'warn' };
    if (e.credits_remaining !== null) {
        return { text: `${e.credits_remaining} crédito${e.credits_remaining === 1 ? '' : 's'}`, tone: 'ok' };
    }
    return null;
}

/**
 * Caja para meter a alguien a la clase: buscar y un clic (o Enter) por persona.
 * Tras agregar, limpia y deja el foco listo para el siguiente.
 */
export const AddAttendeePanel: React.FC<AddAttendeePanelProps> = ({ branchId, session, mode, bookedIds, attendedIds }) => {
    const createBooking = useCreateBooking(branchId, session.id);
    const [term, setTerm] = useState('');
    const { query: search, isStale } = useMemberSearch(branchId, term);
    const inputRef = useRef<HTMLInputElement>(null);
    const [added, setAdded] = useState<string | null>(null);
    // Intento pendiente: si falla por red, reintentar al mismo socio reusa el UUID (idempotente).
    const pending = useRef<{ memberId: string; bookingId: string } | null>(null);

    const results = isStale ? [] : search.data ?? [];
    const eligibility = useEligibility(
        branchId,
        mode.kind === 'blocked' ? null : session.id,
        results.map((m) => m.id),
    );
    const eligibilityById = new Map((eligibility.data ?? []).map((e) => [e.member_id, e]));

    useEffect(() => {
        if (!added) return;
        const t = window.setTimeout(() => setAdded(null), 4000);
        return () => window.clearTimeout(t);
    }, [added]);

    if (mode.kind === 'blocked') {
        return (
            <section aria-labelledby="add-title" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <h3 id="add-title" className="sr-only">
                    Agregar a la clase
                </h3>
                <p className="text-sm text-slate-600">{mode.reason}</p>
            </section>
        );
    }

    const walkIn = mode.kind === 'walk_in';
    const isBlockedFor = (m: BookableMember) => {
        if (attendedIds.has(m.id)) return 'Ya registrado';
        // En walk-in, alguien ya reservado se puede registrar: el backend marca su reserva como asistió.
        if (bookedIds.has(m.id)) return walkIn ? null : 'Ya inscrito';
        const e = eligibilityById.get(m.id);
        if (e && !e.eligible && e.code !== 'already_booked') return e.message ?? 'No puede reservar';
        return null;
    };

    const add = (member: BookableMember) => {
        if (createBooking.isPending || isBlockedFor(member)) return;
        const prev = pending.current;
        const vars = prev && prev.memberId === member.id ? prev : { memberId: member.id, bookingId: crypto.randomUUID() };
        pending.current = vars;
        createBooking.mutate(
            { ...vars, checkIn: walkIn },
            {
                onSuccess: () => {
                    pending.current = null;
                    setAdded(member.full_name);
                    setTerm('');
                    inputRef.current?.focus();
                },
                onError: (err) => {
                    if (err.code !== 'network') pending.current = null;
                },
            },
        );
    };

    const firstAddable = results.find((m) => !isBlockedFor(m));
    const error = createBooking.error instanceof AgendaError ? createBooking.error.message : createBooking.error ? 'No se pudo agregar.' : null;
    const showList = term.trim().length >= 2;

    return (
        <section aria-labelledby="add-title" className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-baseline justify-between gap-2">
                <h3 id="add-title" className="text-sm font-semibold text-slate-900">
                    {walkIn ? 'Registrar asistencia' : 'Agregar a la clase'}
                </h3>
                <span className="text-xs text-slate-500">
                    {walkIn ? 'Entra directo como “asistió”' : `${Math.max(0, session.capacity - session.booked_count)} lugares libres`}
                </span>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                    ref={inputRef}
                    autoFocus
                    type="search"
                    value={term}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        createBooking.reset();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && firstAddable) {
                            e.preventDefault();
                            add(firstAddable);
                        }
                    }}
                    placeholder="Nombre o número de socio"
                    aria-label={walkIn ? 'Buscar socio para registrar asistencia' : 'Buscar socio para agregar a la clase'}
                    aria-controls="add-results"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-600"
                />
            </div>

            <div aria-live="polite" className="min-h-0">
                {added && (
                    <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                        <CheckCircle2 size={16} aria-hidden /> {added} {walkIn ? 'registrado como asistió' : 'agregado a la clase'}.
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-sm text-rose-700">
                        {error}
                    </p>
                )}
            </div>

            {showList && (
                <ul id="add-results" className="border border-slate-100 rounded-md divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {isStale && (
                        <li className="px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" aria-hidden /> Buscando…
                        </li>
                    )}
                    {!isStale && search.isError && (
                        <li className="px-3 py-2.5 text-sm text-rose-700">
                            No se pudo buscar socios.{' '}
                            <button type="button" className="underline" onClick={() => search.refetch()}>
                                Reintentar
                            </button>
                        </li>
                    )}
                    {!isStale && search.isSuccess && results.length === 0 && (
                        <li className="px-3 py-2.5 text-sm text-slate-400">Sin resultados para “{term.trim()}”.</li>
                    )}
                    {results.map((m) => {
                        const blocked = isBlockedFor(m);
                        const chip = blocked ? null : eligibilityChip(eligibilityById.get(m.id));
                        const busy = createBooking.isPending && createBooking.variables?.memberId === m.id;
                        return (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    disabled={Boolean(blocked) || createBooking.isPending}
                                    onClick={() => add(m)}
                                    className="group w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed focus:outline-none focus-visible:bg-slate-50"
                                >
                                    <span
                                        aria-hidden
                                        className="h-8 w-8 shrink-0 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center"
                                    >
                                        {initials(m.full_name)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-sm truncate ${blocked ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {m.full_name}
                                        </span>
                                        <span className="block text-xs text-slate-400">
                                            #{m.code}
                                            {blocked && <span className="text-amber-700"> · {blocked}</span>}
                                            {chip && (
                                                <span className={chip.tone === 'warn' ? 'text-amber-700' : 'text-slate-500'}> · {chip.text}</span>
                                            )}
                                        </span>
                                    </span>
                                    {!blocked && (
                                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-700 border border-slate-200 rounded-md px-2 py-1 group-hover:bg-white group-hover:border-slate-300">
                                            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <UserPlus size={14} aria-hidden />}
                                            {walkIn ? 'Registrar' : 'Agregar'}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            {!showList && !added && !error && (
                <p className="text-xs text-slate-400">Escribe al menos 2 letras. Enter agrega al primer resultado.</p>
            )}
        </section>
    );
};
