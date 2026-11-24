import { ApiError } from '../../hooks/useApi';
import {
    AgendaError,
    type AgendaConflict,
    type AgendaDataSource,
    type ClassBooking,
    type ClassRoom,
    type ClassSessionSummary,
    type ClassTemplate,
    type Coach,
    type MemberEligibility,
} from './types';

type ApiCall = <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;

const FALLBACK_MESSAGE: Record<number, string> = {
    401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    403: 'No tienes permiso para hacer esto en esta sucursal.',
    404: 'No se encontró el registro.',
    422: 'Revisa los datos del formulario.',
};

/** Convierte cualquier error de red/HTTP en AgendaError con mensaje en español. */
export function toAgendaError(err: unknown): AgendaError {
    if (err instanceof AgendaError) return err;
    if (err instanceof ApiError) {
        const detail = (err.detail && typeof err.detail === 'object' ? err.detail : {}) as Record<string, unknown>;
        const conflict = (detail.conflict && typeof detail.conflict === 'object' ? detail.conflict : null) as AgendaConflict | null;
        const code = err.code ?? (err.status === 403 ? 'forbidden' : err.status === 404 ? 'not_found' : `http_${err.status}`);
        // Mensajes de negocio vienen de detail.message; los de validación (422) son listas técnicas.
        const message = err.code ? err.message : FALLBACK_MESSAGE[err.status] ?? 'Ocurrió un error. Intenta de nuevo.';
        return new AgendaError(code, message, err.status, conflict);
    }
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return new AgendaError('network', 'No se pudo conectar con el servidor. Revisa tu conexión.', null);
}

export function createHttpAgendaSource(branchId: string, apiCall: ApiCall): AgendaDataSource {
    const base = `/api/v1/branches/${encodeURIComponent(branchId)}/classes`;

    const call = async <T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> => {
        const { json, ...rest } = init ?? {};
        try {
            return await apiCall<T>(`${base}${path}`, {
                ...rest,
                ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
            });
        } catch (err) {
            throw toAgendaError(err);
        }
    };
    const post = <T>(path: string, json?: unknown) => call<T>(path, { method: 'POST', json: json ?? {} });
    const patch = <T>(path: string, json: unknown) => call<T>(path, { method: 'PATCH', json });

    return {
        listRooms: (includeArchived = false) =>
            call<ClassRoom[]>(`/rooms${includeArchived ? '?include_archived=true' : ''}`),
        createRoom: (input) => post<ClassRoom>('/rooms', input),
        updateRoom: (roomId, body) => patch<ClassRoom>(`/rooms/${roomId}`, body),
        listCoaches: () => call<Coach[]>('/coaches'),
        listTemplates: () => call<ClassTemplate[]>('/templates'),
        createTemplate: (input) => post<ClassTemplate>('/templates', input),
        closeTemplate: (templateId, endsOn) => post<ClassTemplate>(`/templates/${templateId}/close`, { ends_on: endsOn }),
        listSessions: (from, to, filters) => {
            const q = new URLSearchParams({ from, to });
            if (filters?.coach_member_id) q.set('coach_member_id', filters.coach_member_id);
            if (filters?.room_id) q.set('room_id', filters.room_id);
            return call<ClassSessionSummary[]>(`/sessions?${q}`);
        },
        createSession: (input) => post<ClassSessionSummary>('/sessions', input),
        updateSession: (sessionId, body) => patch<ClassSessionSummary>(`/sessions/${sessionId}`, body),
        cancelSession: (sessionId, reason) => post<ClassSessionSummary>(`/sessions/${sessionId}/cancel`, { reason }),
        listBookings: (sessionId) => call<ClassBooking[]>(`/sessions/${sessionId}/bookings`),
        createBooking: (sessionId, memberId, bookingId, checkIn = false) =>
            post<ClassBooking>(`/sessions/${sessionId}/bookings`, {
                id: bookingId,
                member_id: memberId,
                ...(checkIn ? { check_in: true } : {}),
            }),
        checkEligibility: (sessionId, memberIds) =>
            call<MemberEligibility[]>(
                `/sessions/${sessionId}/eligibility?${new URLSearchParams({ member_ids: memberIds.join(',') })}`,
            ),
        cancelBooking: (sessionId, bookingId, overrideWindow = false) =>
            post<ClassBooking>(`/sessions/${sessionId}/bookings/${bookingId}/cancel`, { override_window: overrideWindow }),
        checkInBooking: (sessionId, bookingId) => post<ClassBooking>(`/sessions/${sessionId}/bookings/${bookingId}/check-in`),
    };
}
