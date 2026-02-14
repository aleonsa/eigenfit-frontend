import { Home, BarChart3, Users, QrCode, Briefcase, CreditCard } from 'lucide-react';
import React from 'react';

export interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

export const menuItems: MenuItem[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'visita', label: 'Registrar visita', icon: QrCode },
    { id: 'negocio', label: 'Negocio', icon: BarChart3 },
    { id: 'members', label: 'Miembros', icon: Users },
    { id: 'employees', label: 'Staff/Empleados', icon: Briefcase },
    { id: 'memberships', label: 'Membresías', icon: CreditCard },
];
