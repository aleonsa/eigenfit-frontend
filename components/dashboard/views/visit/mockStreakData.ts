export interface MockMember {
    id: string;
    name: string;
    streakDays: number;
    monthVisits: number;
}

// Mock leaderboard data sorted by streak (descending)
export const mockMembers: MockMember[] = [
    { id: '101', name: 'Ana García', streakDays: 18, monthVisits: 22 },
    { id: '102', name: 'Carlos Mendoza', streakDays: 14, monthVisits: 18 },
    { id: '103', name: 'María López', streakDays: 11, monthVisits: 15 },
    { id: '104', name: 'Pedro Ramírez', streakDays: 9, monthVisits: 13 },
    { id: '105', name: 'Luis Sánchez', streakDays: 7, monthVisits: 10 },
    { id: '106', name: 'Sofia Torres', streakDays: 6, monthVisits: 9 },
    { id: '107', name: 'Diego Flores', streakDays: 5, monthVisits: 8 },
    { id: '108', name: 'Valentina Cruz', streakDays: 4, monthVisits: 7 },
    { id: '109', name: 'Andrés Morales', streakDays: 3, monthVisits: 6 },
    { id: '110', name: 'Camila Herrera', streakDays: 2, monthVisits: 4 },
    { id: '111', name: 'Juan Pérez', streakDays: 1, monthVisits: 3 },
    { id: '112', name: 'Isabella Ruiz', streakDays: 0, monthVisits: 2 },
];

export const top5 = mockMembers.slice(0, 5);

export function getMemberById(id: string): MockMember | undefined {
    return mockMembers.find((m) => m.id === id);
}

export function getMemberPosition(id: string): number {
    const idx = mockMembers.findIndex((m) => m.id === id);
    return idx === -1 ? -1 : idx + 1;
}