import React, { useState } from 'react';
import { Button } from '../../../ui/Button';
import { useCoaches, useRooms, useUpdateSession } from '../../../../hooks/useAgenda';
import type { ClassSessionPatch, ClassSessionSummary } from '../../../../lib/agenda/types';

interface SessionEditFormProps {
    branchId: string;
    session: ClassSessionSummary;
    onDone: () => void;
}

const fieldClass =
    'w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600';
const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5';

/** Cambios solo a esta fecha: sustituir coach, mover de espacio o ajustar cupo. La serie no cambia. */
export const SessionEditForm: React.FC<SessionEditFormProps> = ({ branchId, session, onDone }) => {
    const rooms = useRooms(branchId);
    const coaches = useCoaches(branchId);
    const update = useUpdateSession(branchId, session.id);

    // Base fija al abrir: el diff y la versión salen de aquí, no de la sesión viva (que el refetch puede cambiar).
    const [base, setBase] = useState(session);
    const [title, setTitle] = useState(base.title);
    const [coachId, setCoachId] = useState(base.coach.id);
    const [roomId, setRoomId] = useState(base.room.id);
    const [capacity, setCapacity] = useState(base.capacity);
    const conflict = update.error?.code === 'version_conflict';

    const reloadFromServer = () => {
        setBase(session);
        setTitle(session.title);
        setCoachId(session.coach.id);
        setRoomId(session.room.id);
        setCapacity(session.capacity);
        update.reset();
    };

    // El coach/espacio actual puede ya no estar disponible; se muestra igual para no perder el valor.
    const coachOptions = [...(coaches.data ?? [])];
    if (!coachOptions.some((c) => c.id === base.coach.id)) coachOptions.unshift(base.coach);
    const roomOptions = [...(rooms.data ?? [])];
    if (!roomOptions.some((r) => r.id === base.room.id)) roomOptions.unshift(base.room);

    // Solo se envían los campos que el usuario cambió respecto a la base.
    const patch: ClassSessionPatch = { version: base.version };
    if (title.trim() !== base.title) patch.title = title.trim();
    if (coachId !== base.coach.id) patch.coach_member_id = coachId;
    if (roomId !== base.room.id) patch.room_id = roomId;
    if (capacity !== base.capacity) patch.capacity = capacity;
    const dirty = Object.keys(patch).length > 1;
    const capacityTooLow = capacity < session.booked_count;
    const valid = !conflict && dirty && title.trim().length > 0 && capacity > 0 && !capacityTooLow;

    const error = update.error;

    return (
        <form
            className="rounded-lg border border-slate-200 p-4 space-y-3"
            onSubmit={(e) => {
                e.preventDefault();
                if (valid) update.mutate(patch, { onSuccess: onDone });
            }}
        >
            <p className="text-xs text-slate-500">Los cambios aplican solo a esta fecha; la serie semanal no cambia.</p>
            <div>
                <label htmlFor="edit-title" className={labelClass}>
                    Nombre
                </label>
                <input id="edit-title" className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="edit-coach" className={labelClass}>
                        Coach
                    </label>
                    <select id="edit-coach" className={fieldClass} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
                        {coachOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.full_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="edit-room" className={labelClass}>
                        Espacio
                    </label>
                    <select id="edit-room" className={fieldClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                        {roomOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                <label htmlFor="edit-capacity" className={labelClass}>
                    Cupo
                </label>
                <input
                    id="edit-capacity"
                    type="number"
                    min={Math.max(1, session.booked_count)}
                    className={fieldClass}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                />
                {capacityTooLow && (
                    <p className="mt-1 text-xs text-rose-700">Ya hay {session.booked_count} reservas; el cupo no puede ser menor.</p>
                )}
            </div>
            {error && (
                <div role="alert" className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                    {conflict ? (
                        <>
                            Alguien más modificó esta clase mientras la editabas.{' '}
                            <button type="button" className="underline" onClick={reloadFromServer}>
                                Cargar la versión actual
                            </button>{' '}
                            y vuelve a aplicar tus cambios.
                        </>
                    ) : (
                        error.message
                    )}
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!valid} isLoading={update.isPending}>
                    Guardar cambios
                </Button>
            </div>
        </form>
    );
};
