import React, { useState } from 'react';
import { Drawer } from '../../ui/Drawer';
import { Button } from '../../ui/Button';
import { User, CreditCard, Clock, RotateCw, Edit2 } from 'lucide-react';

interface Member {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    created_at: string;
}

interface MemberDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    member: Member | null;
}

export const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ isOpen, onClose, member }) => {
    if (!member) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Miembro"
            subtitle={`Información detallada de ${member.full_name}`}
            width="max-w-md"
        >
            <div className="space-y-8 animate-in fade-in duration-300">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{member.full_name}</h3>
                        <p className="text-slate-500 text-sm">{member.email}</p>
                        {member.phone && (
                            <p className="text-slate-400 text-xs mt-0.5">{member.phone}</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-center gap-2">
                        <Edit2 size={16} />
                        Editar
                    </Button>
                    <Button className="justify-center gap-2">
                        <RotateCw size={16} />
                        Renovar
                    </Button>
                </div>

                {/* Membership info placeholder */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <CreditCard size={18} className="text-blue-500" />
                        Membresía Actual
                    </h4>
                    <p className="text-sm text-slate-400">Sin membresía activa</p>
                </div>

                {/* History Timeline (Mock) */}
                <div>
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <Clock size={18} className="text-slate-400" />
                        Historial de Visitas
                    </h4>
                    <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white"></div>
                                <div className="text-sm">
                                    <p className="font-medium text-slate-900">Check-in: Gimnasio</p>
                                    <p className="text-xs text-slate-500">Hoy, 10:30 AM</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </Drawer>
    );
};
