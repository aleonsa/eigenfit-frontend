import React, { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { useCoaches, useCreateSession, useCreateTemplate, useRooms } from '../../../../hooks/useAgenda';
import { AgendaError, type LocalDate } from '../../../../lib/agenda/types';

/** Valores iniciales opcionales, p. ej. para reponer una clase cancelada en su mismo horario. */
export interface ClassPreset {
    mode?: 'weekly' | 'once';
    title?: string;
    level?: string | null;
    date?: LocalDate;
    start?: string; // 'HH:mm'
    duration?: number;
    capacity?: number;
    roomId?: string;
    coachId?: string;
}

interface TemplateModalProps {
    branchId: string;
    isOpen: boolean;
    defaultStartsOn: LocalDate;
    preset?: ClassPreset | null;
    onClose: () => void;
    onOpenSettings: () => void;
}

const WEEKDAYS = [
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
    { value: 7, label: 'Dom' },
];

const fieldClass =
    'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600';
const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5';

function isoWeekdayOf(date: LocalDate): number {
    const d = new Date(`${date}T12:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
}

function messageOf(err: unknown): string {
    return err instanceof AgendaError ? err.message : 'No se pudo crear la clase.';
}

/**
 * Crea una clase: serie semanal (una plantilla por día, como el backend) o de una sola vez.
 * Se monta con `key` para que cada apertura empiece limpia.
 */
export const TemplateModal: React.FC<TemplateModalProps> = ({
    branchId,
    isOpen,
    defaultStartsOn,
    preset,
    onClose,
    onOpenSettings,
}) => {
    const rooms = useRooms(branchId);
    const coaches = useCoaches(branchId);
    const createTemplate = useCreateTemplate(branchId);
    const createSession = useCreateSession(branchId);

    const [mode, setMode] = useState<'weekly' | 'once'>(preset?.mode ?? 'weekly');
    const [title, setTitle] = useState(preset?.title ?? '');
    const [level, setLevel] = useState(preset?.level ?? '');
    const [days, setDays] = useState<number[]>(preset?.date ? [isoWeekdayOf(preset.date)] : []);
    const [startsOn, setStartsOn] = useState<LocalDate>(preset?.date ?? defaultStartsOn);
    const [date, setDate] = useState<LocalDate>(preset?.date ?? defaultStartsOn);
    const [start, setStart] = useState(preset?.start ?? '07:00');
    const [duration, setDuration] = useState(preset?.duration ?? 50);
    const [capacity, setCapacity] = useState<number | null>(preset?.capacity ?? null);
    const [roomId, setRoomId] = useState(preset?.roomId ?? '');
    const [coachId, setCoachId] = useState(preset?.coachId ?? '');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const roomList = rooms.data ?? [];
    const coachList = coaches.data ?? [];
    // Un ID que ya no está entre las opciones (espacio archivado, coach desmarcado) exige elegir de nuevo.
    const pick = (chosen: string, options: { id: string }[]) =>
        options.some((o) => o.id === chosen) ? chosen : chosen ? '' : options[0]?.id ?? '';
    const effectiveRoom = pick(roomId, roomList);
    const effectiveCoach = pick(coachId, coachList);
    const staleRoom = Boolean(roomId) && rooms.isSuccess && effectiveRoom === '';
    const staleCoach = Boolean(coachId) && coaches.isSuccess && effectiveCoach === '';
    const room = roomList.find((r) => r.id === effectiveRoom);
    // Mientras no se edite, el cupo sigue al cupo sugerido del espacio.
    const effectiveCapacity = capacity ?? room?.default_capacity ?? 20;

    const loadingRefs = rooms.isLoading || coaches.isLoading;
    const refsError = rooms.isError || coaches.isError;
    const missingRooms = rooms.isSuccess && roomList.length === 0;
    const missingCoaches = coaches.isSuccess && coachList.length === 0;
    // Mientras guarda una serie (varios POST), cerrar ocultaría el resultado parcial.
    const guardedClose = () => {
        if (!saving) onClose();
    };

    const valid =
        title.trim() &&
        effectiveRoom &&
        effectiveCoach &&
        duration > 0 &&
        effectiveCapacity > 0 &&
        (mode === 'once' ? Boolean(date) : days.length > 0 && Boolean(startsOn));

    const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

    const common = {
        title: title.trim(),
        level: level.trim() || null,
        coach_member_id: effectiveCoach,
        room_id: effectiveRoom,
        local_start: start,
        duration_minutes: duration,
        capacity: effectiveCapacity,
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        setError(null);
        setSaving(true);
        try {
            if (mode === 'once') {
                try {
                    await createSession.mutateAsync({ ...common, date });
                } catch (err) {
                    setError(messageOf(err));
                    return;
                }
            } else {
                // Secuencial: si un día choca, los anteriores ya quedaron creados; lo reportamos con claridad.
                const created: string[] = [];
                for (const iso_weekday of days) {
                    const day = WEEKDAYS.find((w) => w.value === iso_weekday)?.label ?? '';
                    try {
                        await createTemplate.mutateAsync({ ...common, iso_weekday, starts_on: startsOn, ends_on: null });
                        created.push(day);
                    } catch (err) {
                        setError(
                            `${day}: ${messageOf(err)}` +
                                (created.length ? ` Ya se crearon: ${created.join(', ')}. Quita esos días antes de reintentar.` : ''),
                        );
                        if (created.length) setDays((prev) => prev.filter((d) => !created.includes(WEEKDAYS[d - 1].label)));
                        return;
                    }
                }
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={guardedClose} title="Nueva clase">
            {loadingRefs ? (
                <div className="h-40 rounded-md bg-slate-50 animate-pulse" aria-busy aria-label="Cargando espacios y coaches" />
            ) : refsError ? (
                <div role="alert" className="rounded-lg border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700">
                    No se pudieron cargar los espacios o coaches.{' '}
                    <button
                        type="button"
                        className="underline"
                        onClick={() => {
                            if (rooms.isError) void rooms.refetch();
                            if (coaches.isError) void coaches.refetch();
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            ) : missingRooms || missingCoaches ? (
                <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                        <p className="font-medium text-slate-900">Antes de crear clases falta:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {missingRooms && (
                                <li>
                                    Al menos un <strong>espacio</strong> (sala, alberca, carril…). Créalo en{' '}
                                    <em>Agenda → Espacios y series</em>.
                                </li>
                            )}
                            {missingCoaches && (
                                <li>
                                    Al menos un <strong>coach</strong>: en <em>Equipo de trabajo</em>, marca al empleado con
                                    “Da clases”.
                                </li>
                            )}
                        </ul>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cerrar
                        </Button>
                        {missingRooms && (
                            <Button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenSettings();
                                }}
                            >
                                Crear espacio
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4" aria-busy={saving}>
                    <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50" role="radiogroup" aria-label="Frecuencia">
                        {(
                            [
                                ['weekly', 'Cada semana'],
                                ['once', 'Una sola vez'],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={mode === value}
                                onClick={() => setMode(value)}
                                className={`px-3 py-1.5 text-sm rounded ${
                                    mode === value ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label htmlFor="tpl-title" className={labelClass}>
                                Nombre de la clase
                            </label>
                            <input
                                id="tpl-title"
                                className={fieldClass}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej. Spinning, Natación"
                            />
                        </div>
                        <div>
                            <label htmlFor="tpl-level" className={labelClass}>
                                Nivel <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                id="tpl-level"
                                className={fieldClass}
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                placeholder="Ej. Infantil"
                            />
                        </div>
                    </div>

                    {mode === 'weekly' ? (
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <fieldset>
                                <legend className={labelClass}>Días</legend>
                                <div className="flex flex-wrap gap-1.5">
                                    {WEEKDAYS.map((d) => {
                                        const on = days.includes(d.value);
                                        return (
                                            <button
                                                key={d.value}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => toggleDay(d.value)}
                                                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                                                    on
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                            <div>
                                <label htmlFor="tpl-starts-on" className={labelClass}>
                                    A partir de
                                </label>
                                <input
                                    id="tpl-starts-on"
                                    type="date"
                                    className={fieldClass}
                                    value={startsOn}
                                    onChange={(e) => setStartsOn(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="tpl-date" className={labelClass}>
                                Fecha
                            </label>
                            <input id="tpl-date" type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label htmlFor="tpl-start" className={labelClass}>
                                Hora
                            </label>
                            <input id="tpl-start" type="time" step={900} className={fieldClass} value={start} onChange={(e) => setStart(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="tpl-duration" className={labelClass}>
                                Duración (min)
                            </label>
                            <input
                                id="tpl-duration"
                                type="number"
                                min={10}
                                step={5}
                                className={fieldClass}
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label htmlFor="tpl-capacity" className={labelClass}>
                                Cupo
                            </label>
                            <input
                                id="tpl-capacity"
                                type="number"
                                min={1}
                                className={fieldClass}
                                value={effectiveCapacity}
                                onChange={(e) => setCapacity(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="tpl-room" className={labelClass}>
                                Espacio
                            </label>
                            <select id="tpl-room" className={fieldClass} value={effectiveRoom} onChange={(e) => setRoomId(e.target.value)}>
                                {effectiveRoom === '' && (
                                    <option value="" disabled>
                                        Elige un espacio
                                    </option>
                                )}
                                {roomList.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tpl-coach" className={labelClass}>
                                Coach
                            </label>
                            <select id="tpl-coach" className={fieldClass} value={effectiveCoach} onChange={(e) => setCoachId(e.target.value)}>
                                {effectiveCoach === '' && (
                                    <option value="" disabled>
                                        Elige un coach
                                    </option>
                                )}
                                {coachList.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {(staleRoom || staleCoach) && (
                        <p className="text-sm text-amber-700">
                            {staleRoom && 'El espacio original ya no está disponible. '}
                            {staleCoach && 'El coach original ya no da clases. '}
                            Elige otro para continuar.
                        </p>
                    )}

                    {error && (
                        <div role="alert" className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={guardedClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!valid} isLoading={saving}>
                            Crear clase
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
