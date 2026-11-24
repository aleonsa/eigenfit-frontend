/**
 * Contrato de la agenda de clases.
 *
 * Refleja `eigenfit-backend/app/schemas/agenda.py` (API bajo /api/v1/branches/{branchId}/classes).
 * Instantes: strings ISO 8601 en UTC. Fechas locales: 'YYYY-MM-DD' en la zona de la sucursal.
 */

export type ISODateTime = string; // '2026-11-23T13:00:00Z'
export type LocalDate = string; // '2026-11-23'

/** Espacio donde ocurre una clase: sala, alberca, carril, cancha… */
export interface ClassRoom {
    id: string;
    name: string;
    default_capacity: number | null;
    archived_at: ISODateTime | null;
}

export interface ClassRoomInput {
    name: string;
    default_capacity: number | null;
}

/** Coach = empleado de la sucursal marcado como "da clases". */
export interface Coach {
    id: string;
    full_name: string;
}

/** Socio mínimo necesario para reservar (viene de GET /api/v1/members). */
export interface BookableMember {
    id: string;
    full_name: string;
    code: number;
}

interface ClassWindows {
    /** Minutos antes del inicio en que abre la reserva (default 7 días). */
    booking_opens_minutes_before?: number;
    /** Minutos antes del inicio en que cierra la reserva (default 0). */
    booking_closes_minutes_before?: number;
    /** Minutos antes del inicio hasta los que se puede cancelar sin penalización (default 120). */
    cancel_minutes_before?: number;
}

/** Serie semanal: una plantilla por día de la semana. */
export interface ClassTemplate extends ClassWindows {
    id: string;
    title: string;
    level: string | null;
    coach_member_id: string;
    room_id: string;
    /** 1 = lunes … 7 = domingo (ISO). */
    iso_weekday: number;
    /** Hora local 'HH:mm' o 'HH:mm:ss'. */
    local_start: string;
    starts_on: LocalDate;
    ends_on: LocalDate | null;
    duration_minutes: number;
    capacity: number;
}

export type ClassTemplateInput = Omit<ClassTemplate, 'id'>;

/** Clase de una sola vez (sin serie). */
export interface OneOffSessionInput extends ClassWindows {
    title: string;
    level: string | null;
    coach_member_id: string;
    room_id: string;
    date: LocalDate;
    local_start: string;
    duration_minutes: number;
    capacity: number;
}

/** Cambios puntuales a una sesión (sustituir coach, mover de espacio, ajustar cupo). */
export interface ClassSessionPatch {
    version: number;
    title?: string;
    level?: string | null;
    coach_member_id?: string;
    room_id?: string;
    capacity?: number;
}

export type SessionStatus = 'scheduled' | 'cancelled';

/** Resumen de sesión para el calendario: sin datos de socios. */
export interface ClassSessionSummary {
    id: string;
    template_id: string | null;
    occurrence_date: LocalDate | null;
    title: string;
    level: string | null;
    coach: Coach;
    room: ClassRoom;
    starts_at: ISODateTime;
    ends_at: ISODateTime;
    booking_opens_at: ISODateTime;
    booking_closes_at: ISODateTime;
    cancel_until: ISODateTime;
    capacity: number;
    /** Reservas que ocupan lugar: confirmed + attended + no_show. */
    booked_count: number;
    /** Control optimista para PATCH. */
    version: number;
    status: SessionStatus;
    cancel_reason: string | null;
}

export type BookingStatus = 'confirmed' | 'attended' | 'cancelled' | 'no_show';

export interface ClassBooking {
    id: string;
    session_id: string;
    member: BookableMember;
    membership_id: string | null;
    status: BookingStatus;
    confirmed_at: ISODateTime;
    attended_at: ISODateTime | null;
    cancelled_at: ISODateTime | null;
    no_show_at: ISODateTime | null;
    created_at: ISODateTime;
}

export interface MemberEligibility {
    member_id: string;
    eligible: boolean;
    code: AgendaErrorCode | null;
    message: string | null;
    credits_remaining: number | null;
}

export interface SessionFilters {
    coach_member_id?: string;
    room_id?: string;
}

/** Choque devuelto por el backend en `detail.conflict` para room_overlap/coach_overlap. */
export interface AgendaConflict {
    session_id?: string;
    title?: string;
    starts_at?: ISODateTime;
    room_name?: string;
    coach_name?: string;
}

/**
 * Códigos estables de `detail.code`. Se deja abierto (string) porque el backend
 * puede agregar códigos; la UI muestra siempre `message`.
 */
export type AgendaErrorCode =
    | 'class_full'
    | 'already_booked'
    | 'session_cancelled'
    | 'session_started'
    | 'room_overlap'
    | 'coach_overlap'
    | 'coach_not_eligible'
    | 'no_class_access'
    | 'no_credits'
    | 'checkin_closed'
    | 'session_ended'
    | 'duplicate_room_name'
    | 'booking_not_open'
    | 'booking_closed'
    | 'cancel_window_closed'
    | 'checkin_not_open'
    | 'version_conflict'
    | 'invalid_transition'
    | 'not_found'
    | 'forbidden'
    | 'network'
    | (string & {});

export class AgendaError extends Error {
    constructor(
        public code: AgendaErrorCode,
        message: string,
        public status: number | null = null,
        public conflict: AgendaConflict | null = null,
    ) {
        super(message);
        this.name = 'AgendaError';
    }
}

/**
 * Origen de datos de la agenda. Todas las funciones lanzan AgendaError.
 */
export interface AgendaDataSource {
    listRooms(includeArchived?: boolean): Promise<ClassRoom[]>;
    createRoom(input: ClassRoomInput): Promise<ClassRoom>;
    updateRoom(roomId: string, patch: Partial<ClassRoomInput> & { archived?: boolean }): Promise<ClassRoom>;
    listCoaches(): Promise<Coach[]>;
    listTemplates(): Promise<ClassTemplate[]>;
    createTemplate(input: ClassTemplateInput): Promise<ClassTemplate>;
    /** Termina una serie: la última fecha local en que aplica es `endsOn`. */
    closeTemplate(templateId: string, endsOn: LocalDate): Promise<ClassTemplate>;
    /** Sesiones que EMPIEZAN en [from, to) en fechas locales de la sucursal. Máx. 31 días. */
    listSessions(from: LocalDate, to: LocalDate, filters?: SessionFilters): Promise<ClassSessionSummary[]>;
    createSession(input: OneOffSessionInput): Promise<ClassSessionSummary>;
    updateSession(sessionId: string, patch: ClassSessionPatch): Promise<ClassSessionSummary>;
    cancelSession(sessionId: string, reason: string): Promise<ClassSessionSummary>;
    listBookings(sessionId: string): Promise<ClassBooking[]>;
    /**
     * `bookingId` lo genera el cliente para que los reintentos sean idempotentes.
     * `checkIn` registra a un asistente sin reserva previa (walk-in): queda directo en `attended`.
     */
    createBooking(sessionId: string, memberId: string, bookingId: string, checkIn?: boolean): Promise<ClassBooking>;
    /** Preflight: si cada socio puede reservar esta clase y por qué no. Máx. 20 ids. */
    checkEligibility(sessionId: string, memberIds: string[]): Promise<MemberEligibility[]>;
    cancelBooking(sessionId: string, bookingId: string, overrideWindow?: boolean): Promise<ClassBooking>;
    checkInBooking(sessionId: string, bookingId: string): Promise<ClassBooking>;
}
