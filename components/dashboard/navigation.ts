import { Home, BarChart3, Users, QrCode, Briefcase, CreditCard } from 'lucide-react';
import React from 'react';

export interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
}

export const menuItems: MenuItem[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'visita', label: 'Registrar visita', icon: QrCode },
    { id: 'negocio', label: 'Negocio', icon: BarChart3, adminOnly: true },
    { id: 'members', label: 'Miembros', icon: Users },
    { id: 'employees', label: 'Staff/Empleados', icon: Briefcase, adminOnly: true },
    { id: 'memberships', label: 'Membresías', icon: CreditCard },
];
