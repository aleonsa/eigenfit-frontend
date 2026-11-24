import React, { useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { Drawer } from '../../../ui/Drawer';
import { Button } from '../../../ui/Button';
import { useCloseTemplate, useCoaches, useRooms, useSaveRoom, useTemplates } from '../../../../hooks/useAgenda';
import { addLocalDays } from '../../../../lib/agenda/time';
import type { ClassRoom, ClassTemplate, LocalDate } from '../../../../lib/agenda/types';

interface AgendaSettingsDrawerProps {
    branchId: string;
    isOpen: boolean;
    today: LocalDate;
    onClose: () => void;
}

const fieldClass =
    'w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600';
const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-slate-500';
const WEEKDAY = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatLocalDate(date: LocalDate): string {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T12:00:00Z`),
    );
}

/** Alta/edición de un espacio. Sin `room` crea uno nuevo. */
const RoomForm: React.FC<{ branchId: string; room?: ClassRoom; onDone: () => void }> = ({ branchId, room, onDone }) => {
    const save = useSaveRoom(branchId);
    const [name, setName] = useState(room?.name ?? '');
    const [capacity, setCapacity] = useState(room?.default_capacity?.toString() ?? '');
    const cap = capacity.trim() ? Number(capacity) : null;
    const valid = name.trim().length > 0 && (cap === null || (Number.isInteger(cap) && cap > 0));

    return (
        <form
            className="rounded-lg border border-slate-200 p-3 space-y-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (!valid) return;
                save.mutate({ roomId: room?.id, input: { name: name.trim(), default_capacity: cap } }, { onSuccess: onDone });
            }}
        >
            <div className="grid grid-cols-[1fr_7rem] gap-2">
                <div>
                    <label htmlFor={`room-name-${room?.id ?? 'new'}`} className="block text-xs font-medium text-slate-700 mb-1">
                        Nombre
                    </label>
                    <input
                        id={`room-name-${room?.id ?? 'new'}`}
                        autoFocus
                        className={fieldClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Sala de spinning, Alberca carril 1"
                    />
                </div>
                <div>
                    <label htmlFor={`room-cap-${room?.id ?? 'new'}`} className="block text-xs font-medium text-slate-700 mb-1">
                        Cupo sugerido
                    </label>
                    <input
                        id={`room-cap-${room?.id ?? 'new'}`}
                        type="number"
                        min={1}
                        className={fieldClass}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="—"
                    />
                </div>
            </div>
            {save.error && (
                <p role="alert" className="text-sm text-rose-700">
                    {save.error.message}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!valid} isLoading={save.isPending}>
                    {room ? 'Guardar' : 'Crear espacio'}
                </Button>
            </div>
        </form>
    );
};

const TemplateRow: React.FC<{
    branchId: string;
    template: ClassTemplate;
    roomName: string;
    coachName: string;
    today: LocalDate;
}> = ({ branchId, template, roomName, coachName, today }) => {
    const close = useCloseTemplate(branchId);
    const [closing, setClosing] = useState(false);
    const [endsOn, setEndsOn] = useState<LocalDate>(today < template.starts_on ? template.starts_on : today);
    // Una serie que aún no empieza se elimina completa: el backend lo interpreta con ends_on = día anterior al inicio.
    const notStarted = today < template.starts_on;
    const [deleting, setDeleting] = useState(false);

    return (
        <li className="py-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-slate-900">
                        {template.title}
                        {template.level && <span className="ml-1.5 text-xs text-slate-500">· {template.level}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                        {WEEKDAY[template.iso_weekday]} {template.local_start.slice(0, 5)} · {template.duration_minutes} min · {roomName} ·{' '}
                        {coachName}
                    </p>
                    <p className="text-xs text-slate-400">
                        Desde {formatLocalDate(template.starts_on)}
                        {template.ends_on ? ` hasta ${formatLocalDate(template.ends_on)}` : ' · sin fecha de fin'}
                    </p>
                </div>
                {!closing && !deleting && (
                    <div className="flex shrink-0">
                        {notStarted && (
                            <button
                                type="button"
                                onClick={() => setDeleting(true)}
                                className="text-xs font-medium text-slate-500 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50"
                            >
                                Eliminar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setClosing(true)}
                            className="text-xs font-medium text-slate-500 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50"
                        >
                            Terminar serie
                        </button>
                    </div>
                )}
            </div>
            {deleting && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 space-y-2">
                    <p className="text-sm text-slate-700">
                        La serie aún no empieza. Se eliminarán todas sus clases; si alguna ya tiene reservas, se cancela y se libera el lugar.
                    </p>
                    {close.error && <p className="text-sm text-rose-700">{close.error.message}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDeleting(false)}>
                            Volver
                        </Button>
                        <Button
                            variant="danger"
                            isLoading={close.isPending}
                            onClick={() =>
                                close.mutate(
                                    { templateId: template.id, endsOn: addLocalDays(template.starts_on, -1) },
                                    { onSuccess: () => setDeleting(false) },
                                )
                            }
                        >
                            Eliminar serie
                        </Button>
                    </div>
                </div>
            )}
            {closing && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 space-y-2">
                    <label htmlFor={`ends-${template.id}`} className="block text-xs font-medium text-slate-700">
                        Última fecha de la serie
                    </label>
                    <input
                        id={`ends-${template.id}`}
                        type="date"
                        min={template.starts_on}
                        className={fieldClass}
                        value={endsOn}
                        onChange={(e) => setEndsOn(e.target.value)}
                    />
                    <p className="text-xs text-slate-600">
                        Las clases posteriores se quitan; si alguna ya tiene reservas, se cancela y se libera el lugar.
                    </p>
                    {close.error && <p className="text-sm text-rose-700">{close.error.message}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setClosing(false)}>
                            Volver
                        </Button>
                        <Button
                            variant="danger"
                            isLoading={close.isPending}
                            disabled={!endsOn}
                            onClick={() => close.mutate({ templateId: template.id, endsOn }, { onSuccess: () => setClosing(false) })}
                        >
                            Terminar
                        </Button>
                    </div>
                </div>
            )}
        </li>
    );
};

/** Configuración de la agenda (admin/owner): espacios, series semanales y quién da clases. */
export const AgendaSettingsDrawer: React.FC<AgendaSettingsDrawerProps> = ({ branchId, isOpen, today, onClose }) => {
    const rooms = useRooms(branchId, true);
    const coaches = useCoaches(branchId);
    const templates = useTemplates(branchId);
    const archive = useSaveRoom(branchId);
    const [editingRoom, setEditingRoom] = useState<string | 'new' | null>(null);

    const roomList = rooms.data ?? [];
    const activeRooms = roomList.filter((r) => !r.archived_at);
    const archivedRooms = roomList.filter((r) => r.archived_at);
    const roomName = (id: string) => roomList.find((r) => r.id === id)?.name ?? 'Espacio';
    const coachName = (id: string) => coaches.data?.find((c) => c.id === id)?.full_name ?? 'Coach';

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Espacios y series" subtitle="Configuración de la agenda">
            <div className="space-y-8">
                <section aria-labelledby="rooms-title" className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 id="rooms-title" className={sectionTitle}>
                            Espacios
                        </h3>
                        {editingRoom !== 'new' && (
                            <button
                                type="button"
                                onClick={() => setEditingRoom('new')}
                                className="text-xs font-medium text-slate-700 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50"
                            >
                                <Plus size={14} /> Nuevo espacio
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Donde ocurre una clase: salas, alberca o cada carril, canchas. Dos clases no pueden usar el mismo espacio a la misma hora.
                    </p>
                    {editingRoom === 'new' && <RoomForm branchId={branchId} onDone={() => setEditingRoom(null)} />}
                    {rooms.isLoading && <div className="h-20 rounded-md bg-slate-50 animate-pulse" aria-busy />}
                    {rooms.isError && <p className="text-sm text-rose-700">{rooms.error.message}</p>}
                    {rooms.isSuccess && activeRooms.length === 0 && editingRoom !== 'new' && (
                        <p className="text-sm text-slate-400 py-2">Aún no hay espacios.</p>
                    )}
                    {archive.error && <p className="text-sm text-rose-700">{archive.error.message}</p>}
                    <ul className="divide-y divide-slate-50">
                        {activeRooms.map((r) =>
                            editingRoom === r.id ? (
                                <li key={r.id} className="py-2">
                                    <RoomForm branchId={branchId} room={r} onDone={() => setEditingRoom(null)} />
                                </li>
                            ) : (
                                <li key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-900 truncate">{r.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {r.default_capacity ? `Cupo sugerido ${r.default_capacity}` : 'Sin cupo sugerido'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setEditingRoom(r.id)}
                                            aria-label={`Editar ${r.name}`}
                                            title="Editar"
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => archive.mutate({ roomId: r.id, input: { archived: true } })}
                                            disabled={archive.isPending}
                                            aria-label={`Archivar ${r.name}`}
                                            title="Archivar (las clases ya creadas se conservan)"
                                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <Archive size={15} />
                                        </button>
                                    </div>
                                </li>
                            ),
                        )}
                    </ul>
                    {archivedRooms.length > 0 && (
                        <details>
                            <summary className="text-xs text-slate-400 cursor-pointer select-none">
                                {archivedRooms.length} archivado{archivedRooms.length === 1 ? '' : 's'}
                            </summary>
                            <ul className="mt-2 space-y-1">
                                {archivedRooms.map((r) => (
                                    <li key={r.id} className="flex items-center justify-between text-sm text-slate-500">
                                        {r.name}
                                        <button
                                            type="button"
                                            onClick={() => archive.mutate({ roomId: r.id, input: { archived: false } })}
                                            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50"
                                        >
                                            <ArchiveRestore size={14} /> Restaurar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </section>

                <section aria-labelledby="coaches-title" className="space-y-2">
                    <h3 id="coaches-title" className={sectionTitle}>
                        Coaches
                    </h3>
                    <p className="text-xs text-slate-500">
                        Son los empleados marcados con “Da clases” en <em>Equipo de trabajo</em>.
                    </p>
                    {coaches.isSuccess &&
                        (coaches.data.length ? (
                            <p className="text-sm text-slate-700">{coaches.data.map((c) => c.full_name).join(', ')}</p>
                        ) : (
                            <p className="text-sm text-slate-400">Ningún empleado está marcado como coach.</p>
                        ))}
                </section>

                <section aria-labelledby="series-title" className="space-y-2">
                    <h3 id="series-title" className={sectionTitle}>
                        Series semanales
                    </h3>
                    {templates.isLoading && <div className="h-20 rounded-md bg-slate-50 animate-pulse" aria-busy />}
                    {templates.isError && <p className="text-sm text-rose-700">{templates.error.message}</p>}
                    {templates.isSuccess && templates.data.length === 0 && (
                        <p className="text-sm text-slate-400 py-2">No hay series activas. Crea una con “Nueva clase”.</p>
                    )}
                    <ul className="divide-y divide-slate-50">
                        {(templates.data ?? []).map((t) => (
                            <TemplateRow
                                key={t.id}
                                branchId={branchId}
                                template={t}
                                roomName={roomName(t.room_id)}
                                coachName={coachName(t.coach_member_id)}
                                today={today}
                            />
                        ))}
                    </ul>
                </section>
            </div>
        </Drawer>
    );
};
