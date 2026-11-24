import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createHttpAgendaSource } from '../lib/agenda/httpAgendaSource';
import type {
    AgendaDataSource, AgendaError, BookableMember, ClassBooking, ClassRoom, ClassRoomInput,
    ClassSessionPatch, ClassSessionSummary, ClassTemplate, ClassTemplateInput, LocalDate,
    MemberEligibility, OneOffSessionInput, SessionFilters,
} from '../lib/agenda/types';
import { useApi } from './useApi';
import { useDebouncedValue } from './useDebouncedValue';

/** Origen de datos de la agenda para la sucursal, ligado al token del usuario. */
export function useAgendaSource(branchId: string): AgendaDataSource {
    const { apiCall } = useApi();
    return useMemo(() => createHttpAgendaSource(branchId, apiCall), [branchId, apiCall]);
}

const keys = {
    sessions: (branchId: string) => ['class-sessions', branchId] as const,
    bookings: (branchId: string) => ['class-bookings', branchId] as const,
    rooms: (branchId: string) => ['class-rooms', branchId] as const,
    coaches: (branchId: string) => ['class-coaches', branchId] as const,
    templates: (branchId: string) => ['class-templates', branchId] as const,
    /** Ficha del socio (MemberDetailDrawer): ['class-member-summary', branchId, memberId]. */
    memberSummary: (branchId: string) => ['class-member-summary', branchId] as const,
};

export function useClassSessions(branchId: string, from: LocalDate, to: LocalDate, filters?: SessionFilters) {
    const source = useAgendaSource(branchId);
    return useQuery<ClassSessionSummary[], AgendaError>({
        queryKey: [...keys.sessions(branchId), from, to, filters],
        queryFn: () => source.listSessions(from, to, filters),
        enabled: Boolean(branchId && from && to),
        placeholderData: (prev) => prev,
    });
}

export function useSessionBookings(branchId: string, sessionId: string | null | undefined) {
    const source = useAgendaSource(branchId);
    return useQuery<ClassBooking[], AgendaError>({
        queryKey: [...keys.bookings(branchId), sessionId],
        // Siempre definido: react-query reporta error si falta queryFn aunque la consulta esté deshabilitada.
        queryFn: () => source.listBookings(sessionId as string),
        enabled: Boolean(branchId && sessionId),
    });
}

export function useRooms(branchId: string, includeArchived = false) {
    const source = useAgendaSource(branchId);
    return useQuery<ClassRoom[], AgendaError>({
        queryKey: [...keys.rooms(branchId), includeArchived],
        queryFn: () => source.listRooms(includeArchived),
        enabled: Boolean(branchId),
        staleTime: 60_000,
    });
}

export function useCoaches(branchId: string) {
    const source = useAgendaSource(branchId);
    return useQuery({
        queryKey: keys.coaches(branchId),
        queryFn: () => source.listCoaches(),
        enabled: Boolean(branchId),
        staleTime: 60_000,
    });
}

export function useTemplates(branchId: string) {
    const source = useAgendaSource(branchId);
    return useQuery<ClassTemplate[], AgendaError>({
        queryKey: keys.templates(branchId),
        queryFn: () => source.listTemplates(),
        enabled: Boolean(branchId),
    });
}

/** Invalida todo lo que muestra cupos, reservas o créditos de la sucursal. */
function useAgendaInvalidation(branchId: string) {
    const queryClient = useQueryClient();
    return () => Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.sessions(branchId) }),
        queryClient.invalidateQueries({ queryKey: keys.bookings(branchId) }),
        queryClient.invalidateQueries({ queryKey: keys.templates(branchId) }),
        queryClient.invalidateQueries({ queryKey: keys.memberSummary(branchId) }),
    ]);
}

export interface CreateBookingVars {
    memberId: string;
    /** Generado una vez por intento del usuario; los reintentos reutilizan el mismo. */
    bookingId: string;
    /** Walk-in: registra asistencia directa (clase en curso o recién terminada). */
    checkIn?: boolean;
}

export function useCreateBooking(branchId: string, sessionId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassBooking, AgendaError, CreateBookingVars>({
        mutationFn: ({ memberId, bookingId, checkIn }) => source.createBooking(sessionId, memberId, bookingId, checkIn),
        onSettled: useAgendaInvalidation(branchId),
    });
}

/** Reservar en cualquier sesión (p. ej. desde la ficha del socio). */
export function useBookSession(branchId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassBooking, AgendaError, CreateBookingVars & { sessionId: string }>({
        mutationFn: ({ sessionId, memberId, bookingId, checkIn }) =>
            source.createBooking(sessionId, memberId, bookingId, checkIn),
        onSettled: useAgendaInvalidation(branchId),
    });
}

/** Elegibilidad de varios socios para una sesión; se usa para avisar antes del clic. */
export function useEligibility(branchId: string, sessionId: string | null | undefined, memberIds: string[]) {
    const source = useAgendaSource(branchId);
    const ids = [...memberIds].sort().slice(0, 20);
    return useQuery<MemberEligibility[], AgendaError>({
        queryKey: [...keys.bookings(branchId), sessionId, 'eligibility', ids],
        queryFn: () => source.checkEligibility(sessionId as string, ids),
        enabled: Boolean(branchId && sessionId && ids.length),
        staleTime: 15_000,
        retry: false,
    });
}

export function useCancelBooking(branchId: string, sessionId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassBooking, AgendaError, { bookingId: string; overrideWindow?: boolean }>({
        mutationFn: ({ bookingId, overrideWindow }) => source.cancelBooking(sessionId, bookingId, overrideWindow),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useCheckInBooking(branchId: string, sessionId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassBooking, AgendaError, string>({
        mutationFn: bookingId => source.checkInBooking(sessionId, bookingId),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useCancelSession(branchId: string, sessionId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassSessionSummary, AgendaError, string>({
        mutationFn: reason => source.cancelSession(sessionId, reason),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useUpdateSession(branchId: string, sessionId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassSessionSummary, AgendaError, ClassSessionPatch>({
        mutationFn: patch => source.updateSession(sessionId, patch),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useCreateTemplate(branchId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassTemplate, AgendaError, ClassTemplateInput>({
        mutationFn: input => source.createTemplate(input),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useCloseTemplate(branchId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassTemplate, AgendaError, { templateId: string; endsOn: LocalDate }>({
        mutationFn: ({ templateId, endsOn }) => source.closeTemplate(templateId, endsOn),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useCreateSession(branchId: string) {
    const source = useAgendaSource(branchId);
    return useMutation<ClassSessionSummary, AgendaError, OneOffSessionInput>({
        mutationFn: input => source.createSession(input),
        onSettled: useAgendaInvalidation(branchId),
    });
}

export function useSaveRoom(branchId: string) {
    const source = useAgendaSource(branchId);
    const queryClient = useQueryClient();
    const invalidateAgenda = useAgendaInvalidation(branchId);
    return useMutation<ClassRoom, AgendaError, { roomId?: string; input: Partial<ClassRoomInput> & { archived?: boolean } }>({
        mutationFn: ({ roomId, input }) =>
            roomId ? source.updateRoom(roomId, input) : source.createRoom(input as ClassRoomInput),
        onSettled: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: keys.rooms(branchId) }),
            invalidateAgenda(),
        ]),
    });
}

export function useMemberSearch(branchId: string, term: string) {
    const { apiCall } = useApi();
    const trimmed = term.trim();
    const search = useDebouncedValue(trimmed, 300);

    const query = useQuery({
        queryKey: ['class-member-search', branchId, search],
        enabled: Boolean(branchId) && trimmed.length >= 2 && search.length >= 2,
        queryFn: async ({ signal }) => {
            const query = new URLSearchParams({ branch_id: branchId, search, limit: '10' });
            const { items } = await apiCall<{ items: BookableMember[] }>(`/api/v1/members?${query}`, { signal });
            return items.map(({ id, full_name, code }) => ({ id, full_name, code }));
        },
    });
    // Mientras corre el debounce, los resultados son del término anterior: no deben poder elegirse.
    const isStale = search !== trimmed || query.isFetching;
    return { query, isStale };
}
