import React, { useState } from 'react';
import { Drawer } from '../../ui/Drawer';
import { Button } from '../../ui/Button';
import { User, Calendar, CreditCard, Clock, RotateCw, Edit2 } from 'lucide-react';

interface Client {
    id: number;
    name: string;
    status: 'Active' | 'Inactive';
    roleOrPlan: string;
    startDate: string;
}

interface ClientDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({ isOpen, onClose, client }) => {
    if (!client) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Cliente"
            subtitle={`Información detallada de ${client.name}`}
            width="max-w-md"
        >
            <div className="space-y-8 animate-in fade-in duration-300">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{client.name}</h3>
                        <p className="text-slate-500 text-sm">Miembro desde {client.startDate}</p>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium mt-1
                            ${client.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {client.status === 'Active' ? 'Activo' : 'Inactivo'}
                        </div>
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

                {/* Current Membership */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <CreditCard size={18} className="text-blue-500" />
                            Membresía Actual
                        </h4>
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {client.roleOrPlan}
                        </span>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Inicio</span>
                            <span className="text-slate-900 font-medium">12 Ene 2024</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Vencimiento</span>
                            <span className="text-slate-900 font-medium">12 Feb 2024</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Días Restantes</span>
                            <span className="text-green-600 font-bold">8 días</span>
                        </div>
                    </div>
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
